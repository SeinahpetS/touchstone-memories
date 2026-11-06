import { beforeEach, describe, expect, it } from 'vitest';
import { keepShare, previewShare, validShareToken } from '../../supabase/functions/_shared/sharing';

const token = 'ab'.repeat(24);
const now = Date.parse('2026-11-06T06:00:00Z');
let share: any;
let original: any;
let rows: any[];
let files: string[];
let calls: any[];
let fail: string;
let race: boolean;
let serial: number;
const uuid = () => `new-${++serial}`;

function admin() {
  return {
    from(table: string) {
      const call: any = { table, op: 'select', filters: {}, payload: null, columns: '' };
      const self: any = {
        select: (columns: string) => { call.columns = columns; return self; },
        eq: (k: string, v: unknown) => { call.filters[k] = v; return self; },
        lt: (k: string, v: unknown) => { call.filters[`lt:${k}`] = v; return self; },
        gte: (k: string, v: unknown) => { call.filters[`gte:${k}`] = v; return self; },
        maybeSingle: () => self,
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return self; },
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return self; },
        delete: () => { call.op = 'delete'; return self; },
        then(resolve: any) {
          calls.push(call);
          let data: any = null;
          let error: any = null;
          if (fail === `${table}:${call.op}`) error = { message: 'Failure' };
          else if (table === 'profiles') data = { first_name: 'Steph', name: 'Steph Volckmann' };
          else if (table === 'touchstone_shares') {
            if (call.op === 'select') data = share;
            else if (race && call.payload.status === 'kept') share.status = 'kept';
            else if (share && share.status === call.filters.status) {
              Object.assign(share, call.payload); data = share;
            }
          } else if (table === 'touchstones') {
            if (call.op === 'select') data = original;
            if (call.op === 'insert') rows.push(call.payload);
            if (call.op === 'delete') rows = rows.filter(r => r.id !== call.filters.id);
          }
          return Promise.resolve({ data, error }).then(resolve);
        },
      };
      return self;
    },
    storage: {
      from(bucket: string) {
        return {
          async copy(source: string, destination: string) {
            calls.push({ op: 'copy', bucket, source, destination });
            if (fail === 'copy') return { error: {} };
            files.push(destination); return { error: null };
          },
          async remove(paths: string[]) {
            calls.push({ op: 'remove', paths });
            if (fail === 'remove') return { error: {} };
            files = files.filter(p => !paths.includes(p)); return { error: null };
          },
        };
      },
    },
  };
}

beforeEach(() => {
  share = { id: 's1', from_user_id: 'sender', touchstone_id: 't1', include_note: false, include_location: false,
    status: 'sent', expires_at: new Date(now + 86400000).toISOString() };
  original = { id: 't1', category: 'moment', title: 'Sunday', photo_url: 'sender/photo.JPG',
    note: 'Private recollection', memory_year: 1999, memory_month: 5, memory_day: 12,
    memory_season: 'spring', when_text: 'May 1999', people: 'Do not copy',
    location_name: 'Carmel, CA', location_lat: 36.55, location_lng: -121.92 };
  rows = []; files = []; calls = []; fail = ''; race = false; serial = 0;
});

describe('share input and public preview', () => {
  it('accepts exactly 48 hex characters', () => {
    expect(validShareToken(token)).toBe(true);
    expect(validShareToken('AB'.repeat(24))).toBe(true);
    for (const bad of [token.slice(1), token + 'a', 'z'.repeat(48), null]) expect(validShareToken(bad)).toBe(false);
  });
  it('returns only sender first name, title, and status', async () => {
    expect(await previewShare(admin(), token, now)).toEqual({ sender_first_name: 'Steph', title: 'Sunday', status: 'sent' });
    expect(calls.find(c => c.table === 'touchstones').columns).toBe('title');
  });
  it('expires a sent share after its expiry time', async () => {
    share.expires_at = new Date(now - 1).toISOString();
    expect((await previewShare(admin(), token, now)).status).toBe('expired');
    expect(share.status).toBe('expired');
  });
  it('does not expire a kept share', async () => {
    share.status = 'kept'; share.expires_at = new Date(now - 1).toISOString();
    expect((await previewShare(admin(), token, now)).status).toBe('kept');
    expect(calls.some(c => c.op === 'update')).toBe(false);
  });
});

describe('keeping a share', () => {
  const keep = () => keepShare(admin(), token, 'recipient', 'https://storage.example', () => now, uuid);
  it.each(['not_found', 'kept', 'expired', 'self'])('rejects %s without creating a memory', async code => {
    if (code === 'not_found') share = null;
    if (code === 'kept' || code === 'expired') share.status = code;
    if (code === 'self') share.from_user_id = 'recipient';
    await expect(keep()).rejects.toMatchObject({ code });
    expect(rows).toEqual([]); expect(files).toEqual([]);
  });
  it('copies the photo into the recipient folder and allowlists memory fields', async () => {
    expect(await keep()).toEqual({ touchstone_id: 'new-1' });
    expect(files).toEqual(['recipient/new-2.JPG']);
    expect(rows).toEqual([{
      id: 'new-1', user_id: 'recipient', category: 'moment', title: 'Sunday', photo_url: 'recipient/new-2.JPG',
      memory_year: 1999, memory_month: 5, memory_day: 12, memory_season: 'spring', when_text: 'May 1999',
      note: '', source_touchstone_id: 't1', received_from_user_id: 'sender', received_from_name: 'Steph', received_note: null,
      location_name: null, location_lat: null, location_lng: null,
    }]);
    expect(share).toMatchObject({ status: 'kept', kept_by_user_id: 'recipient', kept_touchstone_id: 'new-1' });
    expect(calls.some(c => c.table === 'touchstone_mentions')).toBe(false);
  });
  it('places the original note only in received_note when opted in', async () => {
    share.include_note = true;
    await keep();
    expect(rows[0].received_note).toBe('Private recollection'); expect(rows[0].note).toBe('');
  });
  it('copies location only when the sender included it', async () => {
    share.include_location = true;
    await keep();
    expect(rows[0]).toMatchObject({ location_name: 'Carmel, CA', location_lat: 36.55, location_lng: -121.92 });
  });
  it.each(['https://images.example/cover.jpg', '', null])('preserves external or empty photo %s without copying', async photo => {
    original.photo_url = photo;
    await keep();
    expect(rows[0].photo_url).toBe(photo); expect(files).toEqual([]);
  });
  it('copies same-project signed storage URLs rather than retaining sender references', async () => {
    original.photo_url = 'https://storage.example/storage/v1/object/sign/memory-photos/sender/photo.jpg?token=secret';
    await keep();
    expect(rows[0].photo_url).toBe('recipient/new-2.jpg');
  });
  it.each(['copy', 'touchstones:insert', 'touchstone_shares:update'])('rolls back copies and rows on %s failure', async failure => {
    fail = failure;
    await expect(keep()).rejects.toMatchObject({ code: failure === 'copy' ? 'photo_failed' : 'share_failed' });
    expect(rows).toEqual([]); expect(files).toEqual([]); expect(share.status).toBe('sent');
  });
  it('cleans up the losing request when another recipient keeps first', async () => {
    race = true;
    await expect(keep()).rejects.toMatchObject({ code: 'kept' });
    expect(rows).toEqual([]); expect(files).toEqual([]);
  });
  it('refuses a storage path outside the sender folder', async () => {
    original.photo_url = 'someone-else/photo.jpg';
    await expect(keep()).rejects.toMatchObject({ code: 'photo_failed' });
    expect(rows).toEqual([]);
  });
});