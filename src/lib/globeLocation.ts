import { geoArea, geoCentroid, geoOrthographic, geoPath } from "d3-geo";
import type { Geometry } from "geojson";

export interface GlobeSelection {
  country_code: string | null;
  region_code: string | null;
}

export const REGIONAL_COUNTRIES = new Set(["US", "CA", "MX", "BR", "AR", "RU", "CN", "IN", "AU", "ID"]);
export const GLOBE_FOCUS_MS = 600;
export const GLOBE_RADIUS = 146;
export const GLOBE_EXPANDED_SIZE = 420;
/** The mainland is scaled until it spans this much of the frame's width. */
export const GLOBE_FOCUS_WIDTH_RATIO = 0.72;
/** ...but never taller than this much of the frame. */
export const GLOBE_FOCUS_HEIGHT_RATIO = 0.85;
/** A landmass holding this share of the country's area becomes the focus. */
export const MAINLAND_AREA_SHARE = 0.5;

/**
 * Keep only the landmass that holds most of the country, so far-off territories
 * and island chains don't drag the focus out to sea and shrink the mainland.
 */
export function mainlandGeometry(geometry: Geometry): Geometry {
  if (geometry.type !== "MultiPolygon") return geometry;
  const polys = geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }) as Geometry);
  const areas = polys.map((polygon) => geoArea(polygon));
  const total = areas.reduce((sum, area) => sum + area, 0);
  const biggest = Math.max(...areas);
  return total > 0 && biggest / total >= MAINLAND_AREA_SHARE
    ? polys[areas.indexOf(biggest)]
    : geometry;
}

/** Rotation and scale that centre a country's mainland and fill the frame with it. */
export function countryGlobeFocus(country: { geometry: Geometry }, size = 300) {
  const shape = mainlandGeometry(country.geometry);
  const center = geoCentroid(shape);
  const rotation: [number, number, number] = [-center[0], -center[1], 0];
  const radius = size / 2 - 4;
  const projection = geoOrthographic().translate([size / 2, size / 2]).scale(radius).rotate(rotation);
  const bounds = geoPath(projection).bounds(shape);
  const width = bounds[1][0] - bounds[0][0];
  const height = bounds[1][1] - bounds[0][1];
  const fromWidth = width > 0 ? (radius * size * GLOBE_FOCUS_WIDTH_RATIO) / width : radius;
  const fromHeight = height > 0 ? (radius * size * GLOBE_FOCUS_HEIGHT_RATIO) / height : radius;
  const scale = Math.min(fromWidth, fromHeight);
  return { rotation, scale: Number.isFinite(scale) ? Math.max(radius, scale) : radius };
}
export const isGlobeTap = (distance: number) => distance < 6;

export const SELECTION_RING_MIN_PX = 24;
export const SELECTION_RING_RADIUS = 11;
export function needsSelectionRing(bounds: [[number, number], [number, number]]): boolean {
  const [minX, minY] = bounds[0];
  const [maxX, maxY] = bounds[1];
  return Math.max(maxX - minX, maxY - minY) < SELECTION_RING_MIN_PX;
}

export type CityRow = [name: string, country: string, region: string, regionCode: string | null, population: number];
export const normalizeCity = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function rankLocalCities(rows: CityRow[], query: string, selection: GlobeSelection): CityRow[] {
  const search = normalizeCity(query.trim());
  if (search.length < 2) return [];
  const score = (row: CityRow) =>
    (row[1] === selection.country_code ? 2 : 0) +
    (row[1] === selection.country_code && row[3] && row[3] === selection.region_code ? 1 : 0);
  return rows.filter(row => normalizeCity(row[0]).startsWith(search))
    .sort((a, b) => score(b) - score(a) || b[4] - a[4]).slice(0, 3);
}
