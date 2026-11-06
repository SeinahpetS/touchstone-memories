/**
 * Holds content shared into Touchstone ("share to Touchstone") until the
 * capture screen can open with it — across sign-in, Google OAuth and
 * onboarding. The Android share-target service worker writes the same
 * IndexedDB record (see public/share-target-sw.js), so keep DB/STORE/KEY in sync.
 */
export const SHARE_DB = "ts-share";
export const SHARE_STORE = "pending";
export const SHARE_RECORD_KEY = "current";
/** Set while a shared item waits for the user to be signed in and onboarded. */
export const PENDING_SHARE_KEY = "ts_pending_share";
export const CAPTURE_PATH = "/capture";

export interface SharedPayload {
  url?: string | null;
  title?: string | null;
  text?: string | null;
  file?: Blob | null;
  fileName?: string | null;
}

export type SharedPrefill =
  | { kind: "link"; url: string; title: string | null }
  | { kind: "image"; file: File }
  | { kind: "none" };

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/i;

/** First web address in a string, with trailing punctuation trimmed. */
export function findWebAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(URL_RE);
  if (!match) return null;
  const cleaned = match[0].replace(/[),.;:!?\]]+$/, "");
  try {
    const parsed = new URL(cleaned);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? cleaned : null;
  } catch {
    return null;
  }
}

/** Decide how the capture sheet should open for a shared payload. */
export function buildSharedPrefill(payload: SharedPayload | null): SharedPrefill {
  if (!payload) return { kind: "none" };
  const url = findWebAddress(payload.url) ?? findWebAddress(payload.text);
  if (url) {
    const title = (payload.title ?? "").trim();
    return { kind: "link", url, title: title && title !== url ? title : null };
  }
  const file = payload.file;
  if (file && file.size > 0 && (file.type.startsWith("image/") || /\.(heic|heif)$/i.test(payload.fileName ?? ""))) {
    const name = payload.fileName || `shared.${(file.type.split("/")[1] || "jpg").replace("jpeg", "jpg")}`;
    return { kind: "image", file: file instanceof File ? file : new File([file], name, { type: file.type }) };
  }
  return { kind: "none" };
}

export function hasPendingShare(): boolean {
  try { return localStorage.getItem(PENDING_SHARE_KEY) === "1"; } catch { return false; }
}

export function markPendingShare(): void {
  try { localStorage.setItem(PENDING_SHARE_KEY, "1"); } catch { /* ignore */ }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("no indexedDB")); return; }
    const req = indexedDB.open(SHARE_DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(SHARE_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(SHARE_STORE, mode);
      const r = run(t.objectStore(SHARE_STORE));
      t.oncomplete = () => resolve(r.result);
      t.onerror = () => reject(t.error);
    });
  } finally { db.close(); }
}

/** A held share is dropped if it hasn't been saved or cancelled within 24 hours. */
export const SHARE_TTL_MS = 24 * 60 * 60 * 1000;

type StoredShare = SharedPayload & { savedAt?: number };

export function isShareExpired(savedAt: number | undefined, now = Date.now()): boolean {
  return typeof savedAt === "number" && now - savedAt >= SHARE_TTL_MS;
}

export async function saveSharedPayload(payload: SharedPayload): Promise<void> {
  await tx("readwrite", (s) => s.put({ ...payload, savedAt: Date.now() }, SHARE_RECORD_KEY));
}

export async function readSharedPayload(): Promise<SharedPayload | null> {
  try {
    const rec = ((await tx("readonly", (s) => s.get(SHARE_RECORD_KEY))) as StoredShare) ?? null;
    if (!rec) return null;
    if (isShareExpired(rec.savedAt)) { await clearSharedPayload(); return null; }
    if (typeof rec.savedAt !== "number") { // written by the share worker: start its clock now
      await tx("readwrite", (s) => s.put({ ...rec, savedAt: Date.now() }, SHARE_RECORD_KEY));
    }
    const { savedAt: _s, ...payload } = rec;
    return payload;
  } catch { return null; }
}

export async function clearSharedPayload(): Promise<void> {
  try { localStorage.removeItem(PENDING_SHARE_KEY); } catch { /* ignore */ }
  try { await tx("readwrite", (s) => s.delete(SHARE_RECORD_KEY)); } catch { /* ignore */ }
}
