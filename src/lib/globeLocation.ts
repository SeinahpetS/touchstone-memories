export interface GlobeSelection {
  country_code: string | null;
  region_code: string | null;
}

export const REGIONAL_COUNTRIES = new Set(["US", "CA", "MX", "BR", "AR", "RU", "CN", "IN", "AU", "ID"]);
export const GLOBE_FOCUS_MS = 600;
export const isGlobeTap = (distance: number) => distance < 6;

export type CityRow = [name: string, country: string, region: string, regionCode: string | null, population: number];
export const normalizeCity = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function rankLocalCities(rows: CityRow[], query: string, selection: GlobeSelection): CityRow[] {
  const search = normalizeCity(query.trim());
  if (search.length < 2) return [];
  const score = (row: CityRow) =>
    (row[1] === selection.country_code ? 2 : 0) +
    (row[1] === selection.country_code && row[3] && row[3] === selection.region_code ? 1 : 0);
  return rows.filter(row => normalizeCity(row[0]).startsWith(search))
    .sort((a, b) => score(b) - score(a) || b[4] - a[4]).slice(0, 5);
}