import { describe, expect, it } from "vitest";
import { detectMapsPlatform, mapsUrl } from "./openInMaps";

const iphone = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" };
const pixel = { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)" };
const mac = { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 0 };

describe("open in maps", () => {
  it("uses Apple Maps on iPhone Safari", () => {
    expect(detectMapsPlatform(iphone, undefined)).toBe("ios");
    expect(mapsUrl("ios", 36.55, -121.92, "Carmel-by-the-Sea, CA")).toBe("https://maps.apple.com/?ll=36.55,-121.92&q=Carmel-by-the-Sea%2C%20CA");
  });
  it("uses a geo link on Android", () => {
    expect(detectMapsPlatform(pixel, undefined)).toBe("android");
    expect(mapsUrl("android", 47.6, -122.3, "Seattle, WA")).toBe("geo:47.6,-122.3?q=47.6,-122.3(Seattle%2C%20WA)");
  });
  it("trusts the Capacitor platform in the native apps", () => {
    expect(detectMapsPlatform(mac, { isNativePlatform: () => true, getPlatform: () => "android" })).toBe("android");
    expect(detectMapsPlatform(pixel, { isNativePlatform: () => true, getPlatform: () => "ios" })).toBe("ios");
  });
  it("treats desktop as Apple Maps in a new tab", () => {
    expect(detectMapsPlatform(mac, undefined)).toBe("desktop");
    expect(mapsUrl("desktop", 1, 2, "Paris")).toBe("https://maps.apple.com/?ll=1,2&q=Paris");
  });
  it("detects iPad reporting as a Mac", () => {
    expect(detectMapsPlatform({ ...mac, maxTouchPoints: 5 }, undefined)).toBe("ios");
  });
});
