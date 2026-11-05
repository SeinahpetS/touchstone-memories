import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ update: mocks.update }) },
}));

import { saveOnboardingAnswersToProfile } from "./onboardingProfile";
import { emptyOnboardingDraft, loadOnboardingDraft, saveOnboardingDraft } from "./onboardingDraft";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({ error: null });
});

describe("a signed-in visitor's answers go straight to the profile", () => {
  it("saves the name, birth year and city and finishes the flow", async () => {
    saveOnboardingDraft({
      ...emptyOnboardingDraft(),
      firstName: "Steph",
      birthYear: 1962,
      city: "Seattle",
      region: "Washington",
      country: "United States",
      country_code: "US",
      region_code: "WA",
      locationDisplay: "Seattle, Washington, US",
    });
    await saveOnboardingAnswersToProfile("account-1");
    expect(mocks.update).toHaveBeenCalledWith({
      onboarding_complete: true,
      first_name: "Steph",
      name: "Steph",
      birth_year: 1962,
      city: "Seattle",
      location_display: "Seattle, Washington, US",
      region: "Washington",
      country: "United States",
      country_code: "US",
      region_code: "WA",
      place_id: null,
    });
    expect(mocks.eq).toHaveBeenCalledWith("id", "account-1");
    expect(localStorage.getItem("ts_onboarding_complete")).toBe("1");
    expect(loadOnboardingDraft()).toBeNull();
  });

  it("never writes latitude or longitude", async () => {
    saveOnboardingDraft({ ...emptyOnboardingDraft(), firstName: "Steph", city: "Seattle" });
    await saveOnboardingAnswersToProfile("account-1");
    const patch = mocks.update.mock.calls[0][0];
    expect(patch).not.toHaveProperty("lat");
    expect(patch).not.toHaveProperty("lng");
  });

  it("holds the draft back when the profile save fails", async () => {
    mocks.eq.mockResolvedValue({ error: { message: "offline" } });
    saveOnboardingDraft({ ...emptyOnboardingDraft(), firstName: "Steph", city: "Seattle" });
    await expect(saveOnboardingAnswersToProfile("account-1")).rejects.toBeTruthy();
    expect(localStorage.getItem("ts_onboarding_complete")).toBeNull();
    expect(loadOnboardingDraft()).not.toBeNull();
  });
});

describe("the onboarding location draft", () => {
  it("carries no coordinates", () => {
    const draft = emptyOnboardingDraft();
    expect(draft).not.toHaveProperty("lat");
    expect(draft).not.toHaveProperty("lng");
  });
});
