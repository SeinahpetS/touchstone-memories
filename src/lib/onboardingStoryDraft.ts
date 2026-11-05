import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { clearOnboardingDraft, loadOnboardingDraft } from "@/lib/onboardingDraft";
import { resolveProfileCity } from '@/lib/profileCity';
import { removeOnboardingPhoto, uploadOnboardingPhoto } from '@/lib/onboardingPhotos';

export type StoryArtifact = {
  category: Database["public"]["Enums"]["memory_category"];
  title: string;
  note: string;
  source_phrase?: string;
  photoKey?: string;
};

export type OnboardingStoryDraft = {
  story: string;
  artifacts: StoryArtifact[];
  capturedAt: number;
  reviewIndex?: number;
  kept?: (StoryArtifact & { id?: string })[];
};

const KEY = "ts_onboarding_draft";

export function loadOnboardingStoryDraft(): OnboardingStoryDraft | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const draft = JSON.parse(raw) as OnboardingStoryDraft;
  if (!Array.isArray(draft.artifacts)) throw new Error("Your saved story could not be read.");
  return draft;
}

export function saveOnboardingStoryDraft(draft: OnboardingStoryDraft) {
  localStorage.setItem(KEY, JSON.stringify(draft));
}

// Stable IDs are stored before any network request, so retries cannot duplicate cards.
const migrations = new Map<string, Promise<void>>();

export function migrateOnboardingStory(userId: string): Promise<void> {
  const pending = migrations.get(userId);
  if (pending) return pending;
  const task = persistStory(userId).finally(() => migrations.delete(userId));
  migrations.set(userId, task);
  return task;
}

async function persistStory(userId: string) {
  const draft = loadOnboardingStoryDraft();
  if (!draft && !loadOnboardingDraft()) return;
  const kept = (draft?.kept ?? []).map((artifact) => ({
    ...artifact,
    id: artifact.id ?? crypto.randomUUID(),
  }));
  if (draft) saveOnboardingStoryDraft({ ...draft, kept });

  if (kept.length) {
    const rows = await Promise.all(kept.map(async ({ id, category, title, note, photoKey }) => ({
      id, user_id: userId, category, title, note,
      ...(photoKey ? { photo_url: await uploadOnboardingPhoto(userId, id, photoKey) } : {}),
    })));
    const { error } = await supabase.from("touchstones").upsert(
      rows,
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  const personal = loadOnboardingDraft();
  const { error } = await supabase.from("profiles").update({
    onboarding_complete: true,
    ...(personal?.firstName?.trim() ? { first_name: personal.firstName.trim(), name: personal.firstName.trim() } : {}),
    ...(personal?.birthYear ? { birth_year: personal.birthYear } : {}),
    ...(personal?.birthMonth ? { birth_month: personal.birthMonth } : {}),
    ...(personal?.city ? { city: personal.city } : {}),
    ...(personal?.city ? { place_id: personal.placeId ?? null } : {}),
    ...(personal?.state ? { state: personal.state } : {}),
    ...(personal?.region ? { region: personal.region } : {}),
    ...(personal?.country ? { country: personal.country } : {}),
    ...(personal?.locationDisplay ? { location_display: personal.locationDisplay } : {}),
  }).eq("id", userId);
  if (error) throw error;

  await resolveProfileCity();

  // Only discard device photos once every memory and the profile have saved.
  const photoKeys = new Set(draft?.artifacts.concat(kept).flatMap(a => a.photoKey ? [a.photoKey] : []) ?? []);
  await Promise.all([...photoKeys].map(key => removeOnboardingPhoto(key)));
  localStorage.removeItem(KEY);
  clearOnboardingDraft();
}