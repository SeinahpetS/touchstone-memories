import { geoCentroid, geoOrthographic, geoPath } from "d3-geo";
import type { Geometry, MultiPolygon } from "geojson";

export interface GlobeSelection {
  country_code: string | null;
  region_code: string | null;
}

export const REGIONAL_COUNTRIES = new Set(["US", "CA", "MX", "BR", "AR", "RU", "CN", "IN", "AU", "ID"]);
export const GLOBE_FOCUS_MS = 600;
export const GLOBE_RADIUS = 146;
/** The globe's own drawing surface, in viewBox units. */
export const GLOBE_FRAME = 300;
export const GLOBE_EXPANDED_SIZE = 342;
/** Air kept on each side of the expanded globe when a country is framed. */
export const GLOBE_FOCUS_PADDING = 16;
/** The share of the frame a country's focus shape is scaled to fill. */
export const GLOBE_FOCUS_WIDTH_RATIO = (GLOBE_EXPANDED_SIZE - GLOBE_FOCUS_PADDING * 2) / GLOBE_EXPANDED_SIZE;
/** A country taller than this share of the frame is held back so it stays readable. */
export const GLOBE_FOCUS_HEIGHT_RATIO = 0.85;

/** Region codes left out of a country's zoom framing, keyed by country code. */
export const FOCUS_OVERRIDES: Record<string, string[]> = {
  US: ["US-AK", "US-HI", "US-PR", "US-VI", "US-GU", "US-AS", "US-MP"],
};

type RegionLike = { geometry: Geometry; properties: { region_code?: string | null } };

/**
 * The shape a country's zoom is framed on: the region subset its override
 * allows, otherwise the country's full shape.
 */
export function focusGeometryFor(
  country: { geometry: Geometry },
  regions: readonly RegionLike[],
  code: string,
): Geometry {
  const excluded = FOCUS_OVERRIDES[code];
  if (!excluded) return country.geometry;
  const kept = regions.filter(region => !excluded.includes(region.properties.region_code ?? ""));
  if (!kept.length) return country.geometry;
  const coordinates = kept.flatMap(region => region.geometry.type === "MultiPolygon"
    ? (region.geometry as MultiPolygon).coordinates
    : [(region.geometry as unknown as { coordinates: MultiPolygon["coordinates"][0] }).coordinates]);
  return { type: "MultiPolygon", coordinates } as Geometry;
}

/** Rotation and scale that centre a shape and fill the expanded globe with it. */
export function countryGlobeFocus(country: { geometry: Geometry }, size = GLOBE_FRAME, focus?: Geometry) {
  const shape = focus ?? country.geometry;
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

export type CityRow = [name: string, country: string, region: string, regionCode: string | null, population: number, lat?: number, lng?: number];
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
