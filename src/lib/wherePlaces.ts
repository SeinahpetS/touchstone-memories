import { supabase } from "@/integrations/supabase/client";
import type { CityRow } from "./globeLocation";
import { matchCity, type CaptureCity } from "./captureLocation";

export interface GooglePlace { placeId: string; main: string; secondary: string }

const CONSENT_KEY = "ts_google_where_consent";
export type GoogleConsent = "yes" | "no" | null;
export const readGoogleConsent = (): GoogleConsent => { try { const v = localStorage.getItem(CONSENT_KEY); return v === "yes" || v === "no" ? v : null; } catch { return null; } };
export const writeGoogleConsent = (v: "yes" | "no") => { try { localStorage.setItem(CONSENT_KEY, v); } catch { /* ignore */ } };

/** Only the typed text and a random session token go to the backend; Google never sees who you are. */
export async function searchGooglePlaces(input: string, sessionToken: string): Promise<GooglePlace[]> {
  const { data, error } = await supabase.functions.invoke("where-places", { body: { input, sessionToken } });
  if (error) throw error;
  return (data?.places ?? []) as GooglePlace[];
}

/** Keep the confirmed label and Google place_id; coordinates come only from a GeoNames match. */
export function cityFromGoogle(rows: CityRow[] | null, place: GooglePlace): CaptureCity {
  const parts = place.secondary.split(",").map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const geo = rows ? matchCity(rows, `${place.main}, ${part}`) : null;
    if (geo?.lat != null) return { ...geo, placeId: place.placeId };
  }
  return { name: googleLabel(place), lat: null, lng: null, placeId: place.placeId };
}

export const googleLabel = (place: GooglePlace) => {
  const parts = place.secondary.split(",").map(s => s.trim()).filter(Boolean);
  return parts.length ? `${place.main}, ${parts[0]}` : place.main;
};
