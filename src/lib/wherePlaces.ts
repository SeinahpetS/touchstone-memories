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
  const region = place.secondary.split(",")[0]?.trim();
  const label = region ? `${place.main}, ${region}` : place.main;
  const local = rows ? matchCity(rows, label) : null;
  const fallback = rows && local?.lat == null ? matchCity(rows, place.main) : null;
  const geo = local?.lat != null ? local : fallback?.lat != null ? fallback : null;
  return geo ? { ...geo, placeId: place.placeId } : { name: label, lat: null, lng: null, placeId: place.placeId };
}
