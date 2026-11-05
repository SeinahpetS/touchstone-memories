import { describe, expect, it } from "vitest";
import { dismissReviewCard } from "./onboardingReview";

describe("onboarding review decisions", () => {
  it("dismiss removes only that card and advances to the next", () => {
    expect(dismissReviewCard(["Pancakes", "June", "Kitchen"], 1)).toEqual({ remaining: ["Pancakes", "Kitchen"], nextIndex: 1, finished: false });
  });
  it("dismiss of the final card completes review rather than revisiting earlier cards", () => {
    expect(dismissReviewCard(["Pancakes", "June", "Kitchen"], 2)).toEqual({ remaining: ["Pancakes", "June"], nextIndex: 2, finished: true });
  });
});