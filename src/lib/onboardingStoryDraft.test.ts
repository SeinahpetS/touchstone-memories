import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upsert: vi.fn(), update: vi.fn(), eq: vi.fn(), invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke }, from: (table: string) => table === "touchstones"
    ? { upsert: mocks.upsert }
    : { update: mocks.update } },
}));

import { loadOnboardingStoryDraft, migrateOnboardingStory, saveOnboardingStoryDraft } from "./onboardingStoryDraft";

const artifacts = [
  { category: "moment" as const, title: "Sunday Pancakes", note: "Pancakes and coffee." },
  { category: "person" as const, title: "Grandma June", note: "She hummed old songs." },
  { category: "place" as const, title: "The Yellow Kitchen", note: "Sunlight above the sink." },
];

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.invoke.mockResolvedValue({ error: null });
});

describe("onboarding sample cards", () => {
  it("preserves all three cards and review position across reloads", () => {
    saveOnboardingStoryDraft({ story: "Sunday mornings", artifacts, capturedAt: 1, kept: [artifacts[0]], reviewIndex: 1 });
    expect(loadOnboardingStoryDraft()?.artifacts.map(a => a.title)).toEqual(["Sunday Pancakes", "Grandma June", "The Yellow Kitchen"]);
    expect(loadOnboardingStoryDraft()?.reviewIndex).toBe(1);
  });

  it("saves exactly the three kept sample cards to the authenticated user's archive", async () => {
    saveOnboardingStoryDraft({ story: "Sunday mornings", artifacts, capturedAt: 1, kept: artifacts });
    await migrateOnboardingStory("account-1");
    const rows = mocks.upsert.mock.calls[0][0];
    expect(rows.map((row: { title: string }) => row.title)).toEqual(["Sunday Pancakes", "Grandma June", "The Yellow Kitchen"]);
    expect(rows.every((row: { user_id: string }) => row.user_id === "account-1")).toBe(true);
    expect(loadOnboardingStoryDraft()).toBeNull();
  });

  it("does not save dismissed cards", async () => {
    saveOnboardingStoryDraft({ story: "Sunday mornings", artifacts, capturedAt: 1, kept: [artifacts[1]] });
    await migrateOnboardingStory("account-1");
    expect(mocks.upsert.mock.calls[0][0].map((row: { title: string }) => row.title)).toEqual(["Grandma June"]);
  });

  it("retains cards on a save failure and retries with the same IDs", async () => {
    saveOnboardingStoryDraft({ story: "Sunday mornings", artifacts, capturedAt: 1, kept: artifacts });
    mocks.upsert.mockResolvedValueOnce({ error: new Error("offline") });
    await expect(migrateOnboardingStory("account-1")).rejects.toThrow("offline");
    const ids = loadOnboardingStoryDraft()?.kept?.map(a => a.id);
    expect(ids).toHaveLength(3);
    await migrateOnboardingStory("account-1");
    expect(mocks.upsert.mock.calls[1][0].map((row: { id: string }) => row.id)).toEqual(ids);
    expect(mocks.upsert.mock.calls[1][1]).toEqual({ onConflict: "id", ignoreDuplicates: true });
  });

  it("retains cards when profile saving fails", async () => {
    saveOnboardingStoryDraft({ story: "Sunday mornings", artifacts, capturedAt: 1, kept: artifacts });
    mocks.eq.mockResolvedValueOnce({ error: new Error("profile save failed") });
    await expect(migrateOnboardingStory("account-1")).rejects.toThrow("profile save failed");
    expect(loadOnboardingStoryDraft()?.kept).toHaveLength(3);
  });

  it("shares one save request across concurrent archive loads", async () => {
    saveOnboardingStoryDraft({ story: "Sunday mornings", artifacts, capturedAt: 1, kept: artifacts });
    await Promise.all([migrateOnboardingStory("account-1"), migrateOnboardingStory("account-1")]);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });
});