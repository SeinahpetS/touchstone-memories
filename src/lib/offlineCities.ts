import type { CityRow, GlobeSelection } from "./globeLocation";
import { rankLocalCities } from "./globeLocation";

const files = import.meta.glob("../assets/geography/cities/*.json");
const cache = new Map<string, Promise<CityRow[]>>();

function loadCountry(path: string): Promise<CityRow[]> {
  const cached = cache.get(path);
  if (cached) return cached;
  const loader = files[path];
  if (!loader) return Promise.resolve([]);
  const pending = loader().then(module => (module as { default: CityRow[] }).default);
  cache.set(path, pending);
  return pending;
}

export async function searchOfflineCities(query: string, selection: GlobeSelection): Promise<CityRow[]> {
  if (query.trim().length < 2) return [];
  // All country chunks are local assets, loaded only once a search needs them.
  const groups = await Promise.all(Object.keys(files).map(loadCountry));
  return rankLocalCities(groups.flat(), query, selection);
}

export function offlineCityDraft(row: CityRow | null, text: string) {
  return {
    city: row?.[0] ?? text.trim(),
    region: row?.[2] ?? "",
    country: row ? new Intl.DisplayNames(["en"], { type: "region" }).of(row[1]) ?? row[1] : "",
    country_code: row?.[1] ?? null,
    region_code: row?.[3] ?? null,
    placeId: null,
    locationDisplay: row ? `${row[0]}, ${row[2] ? `${row[2]}, ` : ""}${row[1]}` : text.trim(),
  };
}