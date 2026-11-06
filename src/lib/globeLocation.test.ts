import { describe, expect, it } from "vitest";
import { geoBounds, geoCentroid, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countriesRaw from "../assets/geography/countries-110m.json";
import usRegionsRaw from "../assets/geography/regions/US.json";
import {
  countryGlobeFocus,
  FOCUS_OVERRIDES,
  focusGeometryFor,
  GLOBE_EXPANDED_SIZE,
  GLOBE_FOCUS_HEIGHT_RATIO,
  GLOBE_FOCUS_PADDING,
  GLOBE_RADIUS,
  isGlobeTap,
  needsSelectionRing,
  rankLocalCities,
  REGIONAL_COUNTRIES,
  type CityRow,
} from "./globeLocation";

const countries = feature(countriesRaw as never, (countriesRaw as never as { objects: Record<string, never> }).objects.countries).features;
const usRegions = feature(usRegionsRaw as never, Object.values((usRegionsRaw as never as { objects: Record<string, never> }).objects)[0]).features;
const countryByCode = (code: string) => countries.find(country => country.properties.country_code === code)!;

describe("globe focus", () => {
  it("keeps every country but the US framed by its full shape", () => {
    expect(Object.keys(FOCUS_OVERRIDES)).toEqual(["US"]);
    expect(FOCUS_OVERRIDES.US).toEqual(expect.arrayContaining(["US-AK", "US-HI"]));
    const france = countryByCode("FR");
    expect(focusGeometryFor(france, [], "FR")).toBe(france.geometry);
  });

  it("drops the excluded regions from the US focus shape", () => {
    const focus = focusGeometryFor(countryByCode("US"), usRegions, "US");
    const [[west, south], [east, north]] = geoBounds(focus);
    expect(north).toBeLessThan(50); // no Alaska
    expect(south).toBeGreaterThan(24); // no Hawaii
    expect(west).toBeGreaterThan(-126); // no Aleutians or territories
    expect(east).toBeLessThan(-66);
  });

  it("faces the contiguous US toward the viewer", () => {
    const focus = focusGeometryFor(countryByCode("US"), usRegions, "US");
    const [lon, lat] = geoCentroid(focus);
    expect(lon).toBeCloseTo(-98.5, 0);
    expect(lat).toBeCloseTo(39, 0);
    const { rotation, scale } = countryGlobeFocus(countryByCode("US"), 300, focus);
    expect(rotation).toEqual([-lon, -lat, 0]);
    const projection = geoOrthographic().translate([150, 150]).scale(scale).rotate(rotation);
    expect(geoPath(projection).centroid(focus)).toEqual([150, 150]);
  });

  it("fills the expanded globe with the focus, minus 16px on each side", () => {
    const focus = focusGeometryFor(countryByCode("US"), usRegions, "US");
    const { rotation, scale } = countryGlobeFocus(countryByCode("US"), GLOBE_EXPANDED_SIZE, focus);
    const projection = geoOrthographic().translate([GLOBE_EXPANDED_SIZE / 2, GLOBE_EXPANDED_SIZE / 2]).scale(scale).rotate(rotation);
    const bounds = geoPath(projection).bounds(focus);
    const width = bounds[1][0] - bounds[0][0];
    const height = bounds[1][1] - bounds[0][1];
    expect(GLOBE_EXPANDED_SIZE).toBe(342);
    expect(width).toBeCloseTo(GLOBE_EXPANDED_SIZE - GLOBE_FOCUS_PADDING * 2, 0);
    expect(bounds[0][0]).toBeGreaterThan(0);
    expect(bounds[1][0]).toBeLessThan(GLOBE_EXPANDED_SIZE);
    expect(bounds[0][1]).toBeGreaterThan(0);
    expect(bounds[1][1]).toBeLessThan(GLOBE_EXPANDED_SIZE);
    expect(height).toBeLessThan(GLOBE_EXPANDED_SIZE);
  });

  it("holds a tall country back so it stays readable", () => {
    const chile = countryByCode("CL");
    const { rotation, scale } = countryGlobeFocus(chile, GLOBE_EXPANDED_SIZE);
    const projection = geoOrthographic().translate([GLOBE_EXPANDED_SIZE / 2, GLOBE_EXPANDED_SIZE / 2]).scale(scale).rotate(rotation);
    const bounds = geoPath(projection).bounds(chile);
    expect(bounds[1][1] - bounds[0][1]).toBeLessThanOrEqual(GLOBE_EXPANDED_SIZE * GLOBE_FOCUS_HEIGHT_RATIO + 1);
  });

  it("keeps the globe at its base scale in world view", () => {
    expect(GLOBE_EXPANDED_SIZE).toBeGreaterThan(GLOBE_RADIUS * 2);
    const world = geoOrthographic().translate([150, 150]).scale(GLOBE_RADIUS).rotate([0, -22, 0]);
    expect(geoPath(world).centroid(countryByCode("US"))).toEqual([150, 150]);
    expect(world({ longitude: -150, latitude: 0 })).not.toEqual(world({ longitude: 150, latitude: 0 }));
  });

  it("marks a selection too small to find without a ring", () => {
    expect(needsSelectionRing([[140, 150], [152, 162]])).toBe(true);
    expect(needsSelectionRing([[100, 150], [130, 180]])).toBe(false);
  });

  it("treats only a short pointer movement as a tap", () => {
    expect(isGlobeTap(5.9)).toBe(true);
    expect(isGlobeTap(6)).toBe(false);
  });

  it("ranks suggestions by selected country, then region, then population", () => {
    const rows: CityRow[] = [
      ["Berlin", "DE", "Berlin", "DE-BE", 3_600_000],
      ["Bielefeld", "DE", "Nordrhein-Westfalen", "DE-NW", 330_000],
      ["Bern", "CH", "Bern", "CH-BE", 140_000],
    ];
    expect(rankLocalCities(rows, "be", { country_code: "DE", region_code: "DE-NW" }).map(row => row[0]))
      .toEqual(["Bielefeld", "Berlin"]);
    expect(rankLocalCities(rows, "be", { country_code: null, region_code: null }).map(row => row[0]))
      .toEqual(["Berlin", "Bielefeld"]);
    expect(rankLocalCities(rows, "b", { country_code: null, region_code: null })).toEqual([]);
  });

  it("keeps the ten region-aware countries", () => {
    expect([...REGIONAL_COUNTRIES]).toEqual(["US", "CA", "MX", "BR", "AR", "RU", "CN", "IN", "AU", "ID"]);
  });
});
