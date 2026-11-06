import { describe, it, expect } from "vitest";
import { providerFor, EMOTIONAL_TONES, suggestTitle, tagTone } from "./index";
import { toEmotionalTone } from "./tones";

describe("AI provider settings (web)", () => {
  it("uses Claude for questions and stories", () => {
    expect(providerFor("generateQuestion")).toBe("claude");
    expect(providerFor("tellMeAStory")).toBe("claude");
  });
  it("skips nice-to-have tasks", () => {
    for (const t of ["suggestTitle", "suggestCategory", "tagTone", "cleanTranscript"] as const) expect(providerFor(t)).toBe("skip");
  });
  it("skipped tasks return nothing", async () => {
    expect((await suggestTitle({ note: "x" })).data).toBeNull();
    expect((await tagTone({ note: "x" })).data).toBeNull();
  });
});

describe("emotional tones", () => {
  it("is the fixed list", () => {
    expect(EMOTIONAL_TONES).toEqual(["joyful", "tender", "bittersweet", "proud", "nostalgic", "grieving", "peaceful", "funny"]);
  });
  it("rejects free text", () => {
    expect(toEmotionalTone("happy")).toBeNull();
    expect(toEmotionalTone(" Joyful ")).toBe("joyful");
  });
});
