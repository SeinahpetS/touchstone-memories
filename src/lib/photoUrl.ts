import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "memory-photos";
const SIGNED_TTL_SECONDS = 60 * 60; // 1 hour

// Extract the storage object path from either a raw path ("uid/uuid.jpg")
// or a Supabase public URL ("…/storage/v1/object/public/memory-photos/uid/uuid.jpg").
// Returns null for external URLs (Spotify/TMDB/Book covers) so they pass through unchanged.
export function extractMemoryPhotoPath(value: string | null | undefined): string | null {
  if (!value) return null;
  // Already a public/sign URL?
  const marker = `/${BUCKET}/`;
  const idx = value.indexOf(marker);
  if (idx !== -1) {
    return value.substring(idx + marker.length).split("?")[0];
  }
  // Direct path heuristic: "<uuid-or-id>/<filename>" with no scheme
  if (!/^https?:\/\//i.test(value) && value.includes("/")) {
    return value;
  }
  return null;
}

// In-memory cache so we don't re-sign the same path repeatedly.
const cache = new Map<string, { url: string; expiresAt: number }>();

async function signPath(path: string): Promise<string | null> {
  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_TTL_SECONDS * 1000 });
  return data.signedUrl;
}

/** Resolve a stored photo_url to a displayable URL. External URLs pass through. */
export function useDisplayPhotoUrl(stored: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    const path = extractMemoryPhotoPath(stored);
    return path ? null : stored ?? null;
  });

  useEffect(() => {
    const path = extractMemoryPhotoPath(stored);
    if (!path) {
      setUrl(stored ?? null);
      return;
    }
    let cancelled = false;
    void signPath(path).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  return url;
}
