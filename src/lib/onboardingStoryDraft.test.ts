import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upsert: vi.fn(), update: vi.fn(), eq: vi.fn(), invoke: vi.fn() }));
const photos = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/onboardingPhotos", () => ({ uploadOnboardingPhoto: photos.upload, removeOnboardingPhoto: photos.remove }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke }, from: (table: string) => table === "touchstones"
    ? { upsert: mocks.upsert }
    : { update: mocks.update } },
}));

import { loadOnboardingStoryDraft, migrateOnboardingStory, saveOnboardingStoryDraft } from "./onboardingStoryDraft";
import { emptyOnboardingDraft, saveOnboardingDraft } from './onboardingDraft';

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
  photos.upload.mockImplementation(async (user: string, id: string) => `${user}/${id}.jpg`);
  photos.remove.mockResolvedValue(undefined);
});

describe("onboarding sample cards", () => {
  it("holds photos locally before authentication and attaches each to its own kept memory", async () => {
    const first = { ...artifacts[0], photoKey: "photo-1" };
    saveOnboardingStoryDraft({ story: "Sunday", artifacts: [first, artifacts[1]], kept: [first, artifacts[1]], capturedAt: 1 });
    expect(photos.upload).not.toHaveBeenCalled();
    await migrateOnboardingStory("account-1");
    const rows = mocks.upsert.mock.calls[0][0];
    expect(photos.upload).toHaveBeenCalledExactlyOnceWith("account-1", rows[0].id, "photo-1");
    expect(rows[0].photo_url).toBe(`account-1/${rows[0].id}.jpg`);
    expect(rows[1]).not.toHaveProperty("photo_url");
    expect(photos.remove).toHaveBeenCalledWith("photo-1");
  });
  it("retains local photos and stable memory IDs after an upload fails", async () => {
    const card = { ...artifacts[0], photoKey: "photo-1" };
    saveOnboardingStoryDraft({ story: "Sunday", artifacts: [card], kept: [card], capturedAt: 1 });
    photos.upload.mockRejectedValueOnce(new Error("Upload failed"));
    await expect(migrateOnboardingStory("account-1")).rejects.toThrow("Upload failed");
    const id = loadOnboardingStoryDraft()?.kept?.[0].id;
    expect(photos.remove).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    await migrateOnboardingStory("account-1");
    expect(mocks.upsert.mock.calls[0][0][0].id).toBe(id);
  });
  it('resolves city after signed-in migration even when the first story was skipped', async () => {
    saveOnboardingDraft({ ...emptyOnboardingDraft(), city: 'Seattle, WA', locationDisplay: 'Seattle, WA' });
    await migrateOnboardingStory('account-1');
    expect(mocks.update.mock.calls[0][0]).toMatchObject({ city: 'Seattle, WA', place_id: null });
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('lat');
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('lng');
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('city-places', { body: { mode: 'resolve' } });
    await migrateOnboardingStory('account-1');
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
  it('keeps onboarding completion working if optional city lookup fails', async () => {
    saveOnboardingDraft({ ...emptyOnboardingDraft(), city: 'My hometown' });
    mocks.invoke.mockResolvedValueOnce({ error: new Error('Google unavailable') });
    await expect(migrateOnboardingStory('account-1')).resolves.toBeUndefined();
    expect(mocks.update.mock.calls[0][0]).toMatchObject({ city: 'My hometown', place_id: null });
  });
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