import type { CityRow } from "./globeLocation";
import { normalizeCity } from "./globeLocation";

/** A city-level capture location. Coordinates only when it matches a bundled GeoNames city. */
export interface CaptureCity { name: string; lat: number | null; lng: number | null }

const files = import.meta.glob("../assets/geography/cities/*.json");
let all: Promise<CityRow[]> | null = null;
export function loadCities(): Promise<CityRow[]> {
  all ??= Promise.all(Object.values(files).map(l => l().then(m => (m as { default: CityRow[] }).default))).then(g => g.flat());
  return all;
}

const countryName = (code: string) => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; }
};

/** "City, ST" where a short state code exists, otherwise "City, Country". Never street-level. */
export function cityLabel(row: CityRow): string {
  const sub = row[3]?.split("-")[1];
  if (sub && /^[A-Z]{2,3}$/.test(sub) && ["US", "CA", "AU", "MX", "BR", "IN"].includes(row[1])) return `${row[0]}, ${sub}`;
  return `${row[0]}, ${countryName(row[1])}`;
}

const toCity = (row: CityRow): CaptureCity => ({ name: cityLabel(row), lat: row[5] ?? null, lng: row[6] ?? null });

export function rankCities(rows: CityRow[], query: string, limit = 5): CaptureCity[] {
  const q = normalizeCity(query.split(",")[0].trim());
  if (q.length < 2) return [];
  return rows.filter(r => normalizeCity(r[0]).startsWith(q))
    .sort((a, b) => (normalizeCity(b[0]) === q ? 1 : 0) - (normalizeCity(a[0]) === q ? 1 : 0) || b[4] - a[4])
    .slice(0, limit).map(toCity);
}

/** Free text → bundled city when the name (and optional state/country) matches; else text only. */
export function matchCity(rows: CityRow[], text: string): CaptureCity {
  const trimmed = text.trim();
  const [first, ...rest] = trimmed.split(",").map(s => normalizeCity(s.trim()));
  const qualifier = rest.join(",").trim();
  const hits = rows.filter(r => normalizeCity(r[0]) === first && (!qualifier || [r[1], r[2], r[3]?.split("-")[1] ?? "", countryName(r[1])].some(v => v && normalizeCity(v) === qualifier)));
  const best = hits.sort((a, b) => b[4] - a[4])[0];
  return best ? toCity(best) : { name: trimmed, lat: null, lng: null };
}

/** Nearest bundled city within ~50 km of a photo's GPS point; null when none is close. */
export function nearestCity(rows: CityRow[], lat: number, lng: number): CaptureCity | null {
  let best: CityRow | null = null; let bestD = Infinity;
  const k = Math.cos((lat * Math.PI) / 180);
  for (const r of rows) {
    if (r[5] == null || r[6] == null) continue;
    let dLng = Math.abs(r[6] - lng); if (dLng > 180) dLng = 360 - dLng;
    const d = (r[5] - lat) ** 2 + (dLng * k) ** 2;
    if (d < bestD) { bestD = d; best = r; }
  }
  return best && Math.sqrt(bestD) * 111 <= 50 ? toCity(best) : null;
}

/** Read GPS from a photo in the browser. Nothing leaves the device. */
export async function readPhotoGps(file: File): Promise<{ lat: number; lng: number } | null> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) return null;
  try {
    const { gps } = await import("exifr");
    const g = await gps(file);
    return g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude) ? { lat: g.latitude, lng: g.longitude } : null;
  } catch { return null; }
}

export type WhereMode = "hidden" | "collapsed" | "open" | "met";
export function whereModeFor(category: string | null): WhereMode {
  if (category === "digital_traces") return "hidden";
  if (category === "place") return "open";
  if (category === "person") return "met";
  return "collapsed";
}
export const allowsPhotoPrefill = (category: string | null) => category !== "person" && category !== "digital_traces";
