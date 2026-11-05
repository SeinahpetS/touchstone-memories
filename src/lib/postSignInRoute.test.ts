import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: mocks.select,
    }),
  },
}));

import { ARCHIVE_PATH, ONBOARDING_NAME_PATH, resolvePostSignInPath } from "./postSignInRoute";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.select.mockReturnValue({ eq: () => ({ maybeSingle: mocks.maybeSingle }) });
});

describe("where a signed-in user belongs", () => {
  it("sends an account with no city back to the name screen", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { city: null, location_display: null }, error: null });
    expect(await resolvePostSignInPath("account-1")).toBe(ONBOARDING_NAME_PATH);
  });

  it("keeps a signed-in user whose profile already has a city in the archive", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { city: "Seattle", location_display: "Seattle, WA, USA" }, error: null });
    expect(await resolvePostSignInPath("account-1")).toBe(ARCHIVE_PATH);
  });

  it("treats a blank city as no city at all", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { city: "   ", location_display: "" }, error: null });
    expect(await resolvePostSignInPath("account-1")).toBe(ONBOARDING_NAME_PATH);
  });

  it("does not re-open onboarding once the completion flag is set", async () => {
    localStorage.setItem("ts_onboarding_complete", "1");
    expect(await resolvePostSignInPath("account-1")).toBe(ARCHIVE_PATH);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("does not interrupt a personal-info draft still waiting to be moved", async () => {
    localStorage.setItem("ts_onboarding_draft_v1", JSON.stringify({ draft: { city: "" }, savedAt: Date.now() }));
    expect(await resolvePostSignInPath("account-1")).toBe(ARCHIVE_PATH);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("does not interrupt kept story cards still waiting to be moved", async () => {
    localStorage.setItem("ts_onboarding_draft", JSON.stringify({ story: "Sunday", artifacts: [], kept: [], capturedAt: 1 }));
    expect(await resolvePostSignInPath("account-1")).toBe(ARCHIVE_PATH);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("keeps the archive when the profile read fails", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: "offline" } });
    expect(await resolvePostSignInPath("account-1")).toBe(ARCHIVE_PATH);
  });
});
