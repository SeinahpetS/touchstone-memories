// This module is server-only; no privileged credentials are returned or logged.
export const validShareToken = (token: unknown): token is string =>
  typeof token === 'string' && /^[a-fA-F0-9]{48}$/.test(token);

type AdminClient = any;
export class ShareError extends Error {
  constructor(public code: string, public status = 500) { super(code); }
}
const firstName = (profile: { first_name?: string | null; name?: string | null } | null) =>
  (profile?.first_name?.trim() || profile?.name?.trim() || '').split(/\s+/)[0];

async function readShare(admin: AdminClient, token: string) {
  const { data, error } = await admin.from('touchstone_shares')
    .select('id,from_user_id,touchstone_id,include_note,include_location,status,expires_at')
    .eq('token', token).maybeSingle();
  if (error) throw new ShareError('share_failed');
  if (!data) throw new ShareError('not_found', 404);
  return data;
}

async function senderName(admin: AdminClient, userId: string) {
  const { data, error } = await admin.from('profiles').select('first_name,name').eq('id', userId).maybeSingle();
  if (error) throw new ShareError('share_failed');
  return firstName(data);
}

async function expireShare(admin: AdminClient, share: any, now: number) {
  if (share.status !== 'sent' || Date.parse(share.expires_at) >= now) return share.status;
  const { data, error } = await admin.from('touchstone_shares').update({ status: 'expired' })
    .eq('id', share.id).eq('status', 'sent').lt('expires_at', new Date(now).toISOString())
    .select('status').maybeSingle();
  if (error) throw new ShareError('share_failed');
  if (data) return data.status;
  const latest = await admin.from('touchstone_shares').select('status').eq('id', share.id).maybeSingle();
  if (latest.error) throw new ShareError('share_failed');
  if (!latest.data) throw new ShareError('not_found', 404);
  return latest.data.status;
}

export async function previewShare(admin: AdminClient, token: string, now = Date.now()) {
  const share = await readShare(admin, token);
  const status = await expireShare(admin, share, now);
  const { data, error } = await admin.from('touchstones').select('title')
    .eq('id', share.touchstone_id).eq('user_id', share.from_user_id).maybeSingle();
  if (error) throw new ShareError('share_failed');
  if (!data) throw new ShareError('not_found', 404);
  return { sender_first_name: await senderName(admin, share.from_user_id), title: data.title, status };
}

function storagePath(value: string, senderId: string, storageOrigin: string) {
  let path = value;
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    const origin = new URL(storageOrigin).origin;
    if (url.origin !== origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/memory-photos\/(.+)$/);
    if (!match) return null;
    path = decodeURIComponent(match[1]);
  }
  if (!path.startsWith(`${senderId}/`) || path.includes('..') || path.includes('\\')) {
    throw new ShareError('photo_failed');
  }
  return path;
}

async function cleanup(operation: () => PromiseLike<{ error: unknown }>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { if (!(await operation()).error) return true; } catch { /* retry transient failure */ }
  }
  return false;
}

export async function keepShare(
  admin: AdminClient, token: string, recipientId: string, storageOrigin: string,
  now: () => number = Date.now, uuid: () => string = () => crypto.randomUUID(),
) {
  const share = await readShare(admin, token);
  if (share.status === 'kept') throw new ShareError('kept', 409);
  if (await expireShare(admin, share, now()) === 'expired') throw new ShareError('expired', 410);
  if (share.from_user_id === recipientId) throw new ShareError('self', 403);
  const { data: original, error: originalError } = await admin.from('touchstones')
    .select('id,category,title,photo_url,note,memory_year,memory_month,memory_day,memory_season,when_text,location_name,location_lat,location_lng')
    .eq('id', share.touchstone_id).eq('user_id', share.from_user_id).maybeSingle();
  if (originalError) throw new ShareError('share_failed');
  if (!original) throw new ShareError('not_found', 404);
  const name = await senderName(admin, share.from_user_id);
  const newId = uuid();
  let copiedPath: string | null = null;
  let insertAttempted = false;
  try {
    let photo = original.photo_url;
    if (photo) {
      const source = storagePath(photo, share.from_user_id, storageOrigin);
      if (source) {
        const extension = source.match(/\.([A-Za-z0-9]+)$/)?.[1];
        if (!extension) throw new ShareError('photo_failed');
        copiedPath = `${recipientId}/${uuid()}.${extension}`;
        const { error } = await admin.storage.from('memory-photos').copy(source, copiedPath);
        if (error) throw new ShareError('photo_failed');
        photo = copiedPath;
      }
    }
    insertAttempted = true;
    const { error: insertError } = await admin.from('touchstones').insert({
      id: newId, user_id: recipientId, category: original.category, title: original.title,
      photo_url: photo, memory_year: original.memory_year, memory_month: original.memory_month,
      memory_day: original.memory_day, memory_season: original.memory_season, when_text: original.when_text,
      note: '', source_touchstone_id: original.id, received_from_user_id: share.from_user_id,
      received_from_name: name, received_note: share.include_note ? original.note : null,
      // Location travels only when the sender opted in.
      location_name: share.include_location ? original.location_name ?? null : null,
      location_lat: share.include_location ? original.location_lat ?? null : null,
      location_lng: share.include_location ? original.location_lng ?? null : null,
    });
    if (insertError) throw new ShareError('share_failed');
    // Only one concurrent recipient can win; losers remove their own copy and row.
    const { data: kept, error: updateError } = await admin.from('touchstone_shares').update({
      status: 'kept', kept_by_user_id: recipientId, kept_touchstone_id: newId,
    }).eq('id', share.id).eq('status', 'sent').gte('expires_at', new Date(now()).toISOString())
      .select('id').maybeSingle();
    if (updateError) throw new ShareError('share_failed');
    if (!kept) {
      const latest = await readShare(admin, token);
      throw new ShareError(latest.status === 'kept' ? 'kept' : 'expired', latest.status === 'kept' ? 409 : 410);
    }
    return { touchstone_id: newId };
  } catch (error) {
    let cleaned = true;
    if (insertAttempted) cleaned = await cleanup(() => admin.from('touchstones').delete().eq('id', newId).eq('user_id', recipientId));
    if (copiedPath) cleaned = (await cleanup(() => admin.storage.from('memory-photos').remove([copiedPath]))) && cleaned;
    if (!cleaned) throw new ShareError('cleanup_failed');
    throw error;
  }
}