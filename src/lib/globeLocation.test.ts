import { describe, expect, it } from "vitest";
import { GLOBE_FOCUS_MS, REGIONAL_COUNTRIES, isGlobeTap, rankLocalCities, type CityRow } from "./globeLocation";
import countries from "@/assets/geography/countries-110m.json";

describe("onboarding globe rules", () => {
  it("only treats movement under 6px as a tap", () => {
    expect(isGlobeTap(5.99)).toBe(true);
    expect(isGlobeTap(6)).toBe(false);
    expect(isGlobeTap(12)).toBe(false);
  });
  it("focuses for 600ms", () => expect(GLOBE_FOCUS_MS).toBe(600));
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
  it("shows suggestions from two characters with at most five results", () => {
    const selection = { country_code: null, region_code: null };
    expect(rankLocalCities(rows, "s", selection)).toEqual([]);
    expect(rankLocalCities(Array.from({ length: 8 }, (_, i) => ["Seattle" + i, "US", "Washington", "US-WA", i] as CityRow), "se", selection)).toHaveLength(5);
  });
});