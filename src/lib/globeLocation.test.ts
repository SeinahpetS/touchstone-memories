import { describe, expect, it } from "vitest";
import { countryGlobeFocus, mainlandGeometry, GLOBE_EXPANDED_SIZE, GLOBE_RADIUS, GLOBE_FOCUS_MS, GLOBE_FOCUS_WIDTH_RATIO, GLOBE_FOCUS_HEIGHT_RATIO, MAINLAND_AREA_SHARE, SELECTION_RING_MIN_PX, SELECTION_RING_RADIUS, REGIONAL_COUNTRIES, isGlobeTap, needsSelectionRing, rankLocalCities, type CityRow } from "./globeLocation";
import { geoCentroid, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import countries from "@/assets/geography/countries-110m.json";

type Place = Feature<Geometry, { name: string; country_code: string }>;

describe("onboarding globe rules", () => {
  it("only treats movement under 6px as a tap", () => {
    expect(isGlobeTap(5.99)).toBe(true);
    expect(isGlobeTap(6)).toBe(false);
    expect(isGlobeTap(12)).toBe(false);
  });
  it("focuses for 600ms", () => expect(GLOBE_FOCUS_MS).toBe(600));
  const world = feature(countries as unknown as Topology, countries.objects.countries as unknown as GeometryCollection) as FeatureCollection<Geometry, Place["properties"]>;
  const by = (code: string) => {
    const found = world.features.find(f => f.properties?.country_code === code);
    if (!found) throw new Error(`${code} missing`);
    return found as Place;
  };

  it("centers the mainland centroid on the orthographic sphere", () => {
    const country = by("FR");
    const focus = countryGlobeFocus(country);
    const projection = geoOrthographic().translate([150, 150]).rotate(focus.rotation).scale(focus.scale);
    const center = projection(geoCentroid(mainlandGeometry(country.geometry)));
    expect(center?.[0]).toBeCloseTo(150);
    expect(center?.[1]).toBeCloseTo(150);
  });

  it("keeps far-off territories out of the US focus", () => {
    const us = by("US");
    expect(mainlandGeometry(us.geometry).type).toBe("Polygon");
    const focus = countryGlobeFocus(us);
    expect(focus.rotation[0]).toBeCloseTo(98.73, 1);
    expect(focus.rotation[1]).toBeCloseTo(-39.87, 1);
    const projection = geoOrthographic().translate([150, 150]).rotate(focus.rotation).scale(focus.scale);
    const mainland = geoPath(projection).bounds(mainlandGeometry(us.geometry));
    const whole = geoPath(projection).bounds(us.geometry);
    expect(mainland[1][0] - mainland[0][0]).toBeCloseTo(300 * GLOBE_FOCUS_WIDTH_RATIO);
    // Alaska sits outside the frame now, so the whole country cannot fit in it.
    expect(whole[1][0] - whole[0][0]).toBeGreaterThan(300);
  });

  it("fits the mainland to 72% of the frame width without shrinking the globe", () => {
    expect(GLOBE_FOCUS_WIDTH_RATIO).toBe(0.72);
    expect(GLOBE_RADIUS).toBe(146);
    for (const code of ["US", "IN", "FR", "AU"]) {
      const country = by(code);
      const focus = countryGlobeFocus(country);
      const bounds = geoPath(geoOrthographic().translate([150, 150]).rotate(focus.rotation).scale(focus.scale)).bounds(mainlandGeometry(country.geometry));
      expect(bounds[1][0] - bounds[0][0]).toBeCloseTo(300 * GLOBE_FOCUS_WIDTH_RATIO);
      expect(focus.scale).toBeGreaterThanOrEqual(146);
    }
  });

  it("caps a tall country at 85% of the frame height", () => {
    expect(GLOBE_FOCUS_HEIGHT_RATIO).toBe(0.85);
    const chile = by("CL");
    const focus = countryGlobeFocus(chile);
    const bounds = geoPath(geoOrthographic().translate([150, 150]).rotate(focus.rotation).scale(focus.scale)).bounds(mainlandGeometry(chile.geometry));
    expect(bounds[1][1] - bounds[0][1]).toBeCloseTo(300 * GLOBE_FOCUS_HEIGHT_RATIO);
    expect(bounds[1][0] - bounds[0][0]).toBeLessThan(100);
  });

  it("keeps an island chain's full extent because no landmass dominates", () => {
    expect(MAINLAND_AREA_SHARE).toBe(0.5);
    const indonesia = by("ID");
    expect(mainlandGeometry(indonesia.geometry).type).toBe("MultiPolygon");
    const focus = countryGlobeFocus(indonesia);
    const projection = geoOrthographic().translate([150, 150]).rotate(focus.rotation).scale(focus.scale);
    const mainland = geoPath(projection).bounds(mainlandGeometry(indonesia.geometry));
    const whole = geoPath(projection).bounds(indonesia.geometry);
    expect(whole[1][0] - whole[0][0]).toBeCloseTo(mainland[1][0] - mainland[0][0]);
  });

  it("fits the mainland to 72% of the expanded 420px globe", () => {
    expect(GLOBE_EXPANDED_SIZE).toBe(420);
    const us = by("US");
    const focus = countryGlobeFocus(us, GLOBE_EXPANDED_SIZE);
    const bounds = geoPath(geoOrthographic().rotate(focus.rotation).scale(focus.scale)).bounds(mainlandGeometry(us.geometry));
    expect(bounds[1][0] - bounds[0][0]).toBeCloseTo(420 * GLOBE_FOCUS_WIDTH_RATIO);
  });

  it("rings selections smaller than 24px across on screen", () => {
    expect(SELECTION_RING_MIN_PX).toBe(24);
    expect(SELECTION_RING_RADIUS).toBe(11);
    expect(needsSelectionRing([[150, 150], [155, 156]])).toBe(true);
    expect(needsSelectionRing([[150, 150], [174, 160]])).toBe(false);
    expect(needsSelectionRing([[150, 150], [160, 174]])).toBe(false);
  });
  it("loads regions for exactly the ten requested countries", () => {
    expect([...REGIONAL_COUNTRIES]).toEqual(["US", "CA", "MX", "BR", "AR", "RU", "CN", "IN", "AU", "ID"]);
    expect(REGIONAL_COUNTRIES.has("FR")).toBe(false);
    const assets = import.meta.glob("../assets/geography/regions/*.json");
    expect(Object.keys(assets).length).toBe(10);
    for (const code of REGIONAL_COUNTRIES) {
      expect(assets[`../assets/geography/regions/${code}.json`]).toBeDefined();
      expect(countries.objects.countries.geometries.some(g => g.properties.country_code === code)).toBe(true);
    }
  });
  const rows: CityRow[] = [
    ["Springfield", "US", "Illinois", "US-IL", 100000],
    ["Springfield", "US", "Oregon", "US-OR", 50000],
    ["Springfield", "CA", "Ontario", "CA-ON", 200000],
  ];
  it("ranks the selected region first, then the selected country", () => {
    expect(rankLocalCities(rows, "sp", { country_code: "US", region_code: "US-OR" }).map(r => r[3]))
      .toEqual(["US-OR", "US-IL", "CA-ON"]);
  });
  it("typing without selecting geography still returns cities", () => {
    expect(rankLocalCities(rows, "sp", { country_code: null, region_code: null })[0][1]).toBe("CA");
  });
  it("shows suggestions from two characters with at most three results", () => {
    const selection = { country_code: null, region_code: null };
    expect(rankLocalCities(rows, "s", selection)).toEqual([]);
    expect(rankLocalCities(Array.from({ length: 8 }, (_, i) => ["Seattle" + i, "US", "Washington", "US-WA", i] as CityRow), "se", selection)).toHaveLength(3);
  });
});
