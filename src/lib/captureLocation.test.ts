import { describe, expect, it } from "vitest";
import type { CityRow } from "./globeLocation";
import { allowsPhotoPrefill, cityLabel, matchCity, nearestCity, whereModeFor } from "./captureLocation";

const rows: CityRow[] = [
  ["Santa Fe", "US", "New Mexico", "US-NM", 84000, 35.69, -105.94],
  ["Santa Fe", "AR", "Santa Fe", "AR-S", 390000, -31.63, -60.7],
  ["Naples", "IT", "Campania", null, 960000, 40.85, 14.27],
];

describe("capture location", () => {
  it("labels US cities City, ST and others City, Country", () => {
    expect(cityLabel(rows[0])).toBe("Santa Fe, NM");
    expect(cityLabel(rows[2])).toBe("Naples, Italy");
  });
  it("free text matching a city stores coordinates", () => {
    expect(matchCity(rows, "santa fe, nm")).toEqual({ name: "Santa Fe, NM", lat: 35.69, lng: -105.94 });
  });
  it("free text with no match keeps only the name", () => {
    expect(matchCity(rows, "Grandma's porch")).toEqual({ name: "Grandma's porch", lat: null, lng: null });
  });
  it("photo GPS resolves to the nearest city, and nothing when far away", () => {
    expect(nearestCity(rows, 35.7, -105.9)?.name).toBe("Santa Fe, NM");
    expect(nearestCity(rows, 0, -150)).toBeNull();
  });
  it("row behavior by category", () => {
    expect(whereModeFor("place")).toBe("open");
    expect(whereModeFor("person")).toBe("met");
    expect(whereModeFor("digital_traces")).toBe("hidden");
    expect(whereModeFor("food")).toBe("collapsed");
    expect(allowsPhotoPrefill("person")).toBe(false);
  });
});
