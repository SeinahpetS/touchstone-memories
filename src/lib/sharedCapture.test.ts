import { describe, it, expect, beforeEach } from "vitest";
import { buildSharedPrefill, findWebAddress, markPendingShare } from "./sharedCapture";
import { getPendingReturnRoute, PENDING_KEEP_KEY } from "./postSignInRoute";

describe("shared capture", () => {
  beforeEach(() => localStorage.clear());
  it("a url opens Digital Traces as a link with its title", () => {
    expect(buildSharedPrefill({ url: "https://example.com/a", title: "Example" })).toEqual({ kind: "link", url: "https://example.com/a", title: "Example" });
  });
  it("finds a web address inside shared text", () => {
    expect(findWebAddress("look at this https://x.org/p?q=1.")).toBe("https://x.org/p?q=1");
    expect(buildSharedPrefill({ text: "see https://x.org" }).kind).toBe("link");
  });
  it("an image with no link opens with the image", () => {
    const file = new File([new Uint8Array([1, 2])], "s.png", { type: "image/png" });
    const p = buildSharedPrefill({ file, fileName: "s.png" });
    expect(p.kind).toBe("image");
  });
  it("a link wins over an image", () => {
    const file = new File([new Uint8Array([1])], "s.png", { type: "image/png" });
    expect(buildSharedPrefill({ url: "https://a.com", file }).kind).toBe("link");
  });
  it("nothing usable opens plain capture", () => {
    expect(buildSharedPrefill({ text: "just words" }).kind).toBe("none");
    expect(buildSharedPrefill(null).kind).toBe("none");
  });
  it("a waiting share sends a signed-in user to /capture, keeps still win", () => {
    expect(getPendingReturnRoute()).toBeNull();
    markPendingShare();
    expect(getPendingReturnRoute()).toBe("/capture");
    localStorage.setItem(PENDING_KEEP_KEY, "a".repeat(48));
    expect(getPendingReturnRoute()).toBe(`/keep/${"a".repeat(48)}`);
  });
});

import { isShareExpired as _exp, SHARE_TTL_MS as _ttl } from "./sharedCapture";
describe("held share expiry", () => {
  it("keeps a share just under 24 hours old", () => { expect(_exp(0, 24 * 3600_000 - 1)).toBe(false); });
  it("drops a share at 24 hours", () => { expect(_ttl).toBe(24 * 3600_000); expect(_exp(0, 24 * 3600_000)).toBe(true); });
});
