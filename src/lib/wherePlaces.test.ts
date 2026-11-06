import { describe, it, expect } from "vitest";
import { cityFromGoogle } from "./wherePlaces";
import type { CityRow } from "./globeLocation";

const rows = [["Santa Fe", "US", "New Mexico", "US-NM", 80000, 35.69, -105.94]] as unknown as CityRow[];
describe("cityFromGoogle", () => {
  it("uses GeoNames coordinates and keeps the place_id", () => {
    expect(cityFromGoogle(rows, { placeId: "abc", main: "Santa Fe", secondary: "NM, USA" })).toEqual({ name: "Santa Fe, NM", lat: 35.69, lng: -105.94, placeId: "abc" });
  });
  it("stores only the label and place_id when GeoNames has no match", () => {
    expect(cityFromGoogle(rows, { placeId: "xyz", main: "Tinyville", secondary: "Ohio, USA" })).toEqual({ name: "Tinyville, Ohio", lat: null, lng: null, placeId: "xyz" });
  });
});
