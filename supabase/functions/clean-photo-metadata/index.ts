// ONE-TIME JOB: strips EXIF/GPS/XMP/text metadata from every stored photo in
// memory-photos and avatars, in place (same path, same type). Pixels are not
// re-encoded (lossless byte surgery). Never touches database rows.
// POST { "dryRun": true } reports only. Delete this function after the run.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function exifOrientation(seg: Uint8Array): number {
  // seg = APP1 payload starting with "Exif\0\0"
  const t = seg.subarray(6); if (t.length < 8) return 1;
  const le = t[0] === 0x49; const dv = new DataView(t.buffer, t.byteOffset, t.byteLength);
  const u16 = (o: number) => dv.getUint16(o, le), u32 = (o: number) => dv.getUint32(o, le);
  try { const ifd = u32(4); const n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === 0x0112) return u16(e + 8); } } catch { /* */ }
  return 1;
}
function orientationApp1(o: number): Uint8Array {
  const body = [0x45,0x78,0x69,0x66,0,0, 0x4d,0x4d,0,0x2a,0,0,0,8, 0,1, 0x01,0x12,0,3,0,0,0,1,0,o,0,0, 0,0,0,0];
  const len = body.length + 2; return new Uint8Array([0xff, 0xe1, len >> 8, len & 255, ...body]);
}
const has = (s: Uint8Array, str: string) => new TextDecoder('latin1').decode(s.subarray(0, 64)).includes(str);

function cleanJpeg(b: Uint8Array): { out: Uint8Array; removed: string[] } {
  if (b[0] !== 0xff || b[1] !== 0xd8) return { out: b, removed: [] };
  const parts: Uint8Array[] = [b.subarray(0, 2)]; const removed: string[] = []; let orient = 1; let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const m = b[i + 1];
    if (m === 0xda) break; // start of scan: rest is image data
    const len = (b[i + 2] << 8) | b[i + 3]; const seg = b.subarray(i, i + 2 + len); const payload = seg.subarray(4);
    const isApp = m >= 0xe1 && m <= 0xef && m !== 0xe2 && m !== 0xee; // keep APP0 JFIF, APP2 ICC, APP14 Adobe
    if (isApp || m === 0xfe) {
      if (m === 0xe1 && has(payload, 'Exif')) { orient = exifOrientation(payload); removed.push('exif'); }
      else removed.push(m === 0xfe ? 'comment' : m === 0xe1 ? 'xmp' : `app${m - 0xe0}`);
    } else parts.push(seg);
    i += 2 + len;
  }
  if (!removed.length) return { out: b, removed };
  if (orient > 1 && orient <= 8) parts.splice(1, 0, orientationApp1(orient));
  parts.push(b.subarray(i));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return { out, removed };
}
function cleanPng(b: Uint8Array): { out: Uint8Array; removed: string[] } {
  const drop = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']); const parts = [b.subarray(0, 8)]; const removed: string[] = []; let i = 8;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  while (i + 12 <= b.length) { const len = dv.getUint32(i); const type = new TextDecoder().decode(b.subarray(i + 4, i + 8)); const end = i + 12 + len;
    if (drop.has(type)) removed.push(type); else parts.push(b.subarray(i, end)); i = end; }
  if (!removed.length) return { out: b, removed };
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return { out, removed };
}
function cleanWebp(b: Uint8Array): { out: Uint8Array; removed: string[] } {
  const td = new TextDecoder(); if (td.decode(b.subarray(0, 4)) !== 'RIFF' || td.decode(b.subarray(8, 12)) !== 'WEBP') return { out: b, removed: [] };
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength); const parts: Uint8Array[] = []; const removed: string[] = []; let i = 12;
  while (i + 8 <= b.length) { const id = td.decode(b.subarray(i, i + 4)); const len = dv.getUint32(i + 4, true); const end = i + 8 + len + (len & 1);
    if (id === 'EXIF' || id === 'XMP ') removed.push(id.trim()); else parts.push(b.slice(i, end)); i = end; }
  if (!removed.length) return { out: b, removed };
  for (const p of parts) if (td.decode(p.subarray(0, 4)) === 'VP8X') p[8] &= ~0x0c;
  const size = 4 + parts.reduce((n, p) => n + p.length, 0); const out = new Uint8Array(8 + size);
  out.set(b.subarray(0, 4)); new DataView(out.buffer).setUint32(4, size, true); out.set(b.subarray(8, 12), 8);
  let o = 12; for (const p of parts) { out.set(p, o); o += p.length; } return { out, removed };
}

async function listAll(admin: any, bucket: string, prefix = ''): Promise<{ path: string; type: string }[]> {
  const res: { path: string; type: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const e of data ?? []) { const p = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) res.push(...await listAll(admin, bucket, p)); else res.push({ path: p, type: e.metadata?.mimetype ?? '' }); }
    if (!data || data.length < 1000) break;
  }
  return res;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: 'unauthorized' }, 401);
  const dryRun = (await req.json().catch(() => ({})))?.dryRun !== false;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const report = { dryRun, scanned: 0, withMetadata: 0, cleaned: 0, alreadyClean: 0, skipped: [] as string[], failed: [] as string[], removedKinds: {} as Record<string, number> };
  for (const bucket of ['memory-photos', 'avatars']) {
    for (const f of await listAll(admin, bucket)) {
      report.scanned++;
      const key = `${bucket}/${f.path}`;
      try {
        const { data, error } = await admin.storage.from(bucket).download(f.path); if (error || !data) throw error ?? new Error('download');
        const bytes = new Uint8Array(await data.arrayBuffer());
        const type = f.type || data.type;
        const r = /jpe?g/.test(type) ? cleanJpeg(bytes) : /png/.test(type) ? cleanPng(bytes) : /webp/.test(type) ? cleanWebp(bytes) : null;
        if (!r) { report.skipped.push(`${key} (${type})`); continue; }
        if (!r.removed.length) { report.alreadyClean++; continue; }
        report.withMetadata++; for (const k of r.removed) report.removedKinds[k] = (report.removedKinds[k] ?? 0) + 1;
        if (dryRun) continue;
        const { error: upErr } = await admin.storage.from(bucket).upload(f.path, new Blob([r.out], { type }), { upsert: true, contentType: type });
        if (upErr) throw upErr; report.cleaned++;
      } catch { report.failed.push(key); }
    }
  }
  return json(report);
});
