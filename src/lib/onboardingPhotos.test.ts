import { describe, expect, it } from "vitest";
import { PHOTO_MAX_SIDE, resizedPhotoDimensions } from "./onboardingPhotos";

describe("onboarding photo copies", () => {
  it("limits landscape copies to 2048px on the longest side", () => {
    expect(PHOTO_MAX_SIDE).toBe(2048);
    expect(resizedPhotoDimensions(4096, 3072)).toEqual({ width: 2048, height: 1536 });
  });
  it("limits portrait copies to 2048px without enlarging small images", () => {
    expect(resizedPhotoDimensions(3000, 6000)).toEqual({ width: 1024, height: 2048 });
    expect(resizedPhotoDimensions(640, 480)).toEqual({ width: 640, height: 480 });
  });
});