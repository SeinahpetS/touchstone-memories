import { describe, expect, it } from "vitest";
import { offlineCityDraft, searchOfflineCities } from "./offlineCities";

describe("offline onboarding city selection", () => {
  it("saves selected city details and codes without coordinates", () => {
    expect(offlineCityDraft(["Seattle", "US", "Washington", "US-WA", 737015], "Seattle")).toEqual({
      city: "Seattle", region: "Washington", country: "US", country_code: "US", region_code: "US-WA", placeId: null, locationDisplay: "Seattle, Washington, US",
    });
  });
  it("saves unselected typed text with null codes", () => {
    expect(offlineCityDraft(null, " My town ")).toEqual({ city: "My town", region: "", country: "", country_code: null, region_code: null, placeId: null, locationDisplay: "My town" });
  });
  it("searches bundled country files from two characters with three results", async () => {
    expect(await searchOfflineCities("s", { country_code: null, region_code: null })).toEqual([]);
    const rows = await searchOfflineCities("sea", { country_code: "US", region_code: "US-WA" });
    expect(rows).toHaveLength(3);
    expect(rows[0].slice(0, 4)).toEqual(["Seattle", "US", "Washington", "US-WA"]);
  });
});