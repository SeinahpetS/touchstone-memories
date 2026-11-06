import { supabase } from '@/integrations/supabase/client';
import { PENDING_KEEP_KEY } from './postSignInRoute';
export type KeepErrorCode = 'expired' | 'kept' | 'self' | 'not_found';
export type SharePreview = { sender_first_name: string; title: string | null; status: 'sent' | 'kept' | 'expired' };
export class KeepError extends Error {
  constructor(public code: string) { super(code); }
}
export function clearPendingKeep() { try { localStorage.removeItem(PENDING_KEEP_KEY); } catch { /* unavailable */ } }
async function invoke<T>(name: string, token: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: { token } });
  if (error) {
    let code = 'failed';
    try { code = (await error.context?.json())?.error ?? code; } catch { /* not a JSON response */ }
    throw new KeepError(code === 'invalid_token' ? 'not_found' : code);
  }
  if (data?.error) throw new KeepError(data.error);
  return data as T;
}
export const getSharePreview = (token: string) => invoke<SharePreview>('share-preview', token);
export const keepTouchstoneShare = (token: string) => invoke<{ touchstone_id: string }>('share-keep', token);
export const isTerminalKeepError = (code: string): code is KeepErrorCode => ['expired', 'kept', 'self', 'not_found'].includes(code);
export function keepErrorMessage(code: KeepErrorCode, sender: string) {
  const who = sender || 'the sender';
  return {
    expired: `This link has expired. Ask ${who} to send a new one.`,
    kept: 'This memory has already been kept.',
    self: "This is your own memory — it's already in your archive.",
    not_found: `This link doesn't work. Ask ${who} to send it again.`,
  }[code];
}