// Holds the first-memory draft a logged-out visitor builds during onboarding,
// so it can be persisted to the touchstones table after they sign up.
//
// Photos can't be serialized to sessionStorage easily, so we keep the File
// object in memory and only persist the metadata. If the user goes through
// an OAuth round-trip the photo is lost (acceptable — they can add it later).

import type { CategoryKey } from "@/components/CategoryIcon";
import { emptyMemoryDate, type MemoryDate } from "@/lib/memoryDate";

export interface OnboardingDraft {
  category: CategoryKey;
  title: string;
  note: string;
  whoWasThere: string;
  /** Free-form "emotional location" answer captured on S5. */
  emotionalLocation: string;
  /** Map location captured on S6 (Google Places or freeform). */
  mapLocationName: string;
  mapLocationLat: number | null;
  mapLocationLng: number | null;
  /** People-nudge answer captured on the Artifact screen. */
  people: string;
  memoryDate: MemoryDate;
  /** Object URL for the in-memory photo, used for preview only. */
  photoPreview: string | null;
  /** Personal info captured in the post-Begin onboarding flow. */
  firstName?: string;
  birthMonth?: number | null;
  birthYear?: number | null;
  city?: string;
  state?: string;
}

const KEY = "ts_onboarding_draft_v1";

// Photo file is held in module memory; sessionStorage carries the rest.
let photoFile: File | null = null;

export const setOnboardingPhoto = (file: File | null) => {
  photoFile = file;
};
export const getOnboardingPhoto = () => photoFile;

export const emptyOnboardingDraft = (): OnboardingDraft => ({
  category: "moment",
  title: "",
  note: "",
  whoWasThere: "",
  emotionalLocation: "",
  mapLocationName: "",
  mapLocationLat: null,
  mapLocationLng: null,
  people: "",
  memoryDate: emptyMemoryDate(),
  photoPreview: null,
});

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const saveOnboardingDraft = (draft: OnboardingDraft) => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ draft, savedAt: Date.now() })
    );
  } catch {
    /* ignore */
  }
};

export const loadOnboardingDraft = (): OnboardingDraft | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as
      | { draft: OnboardingDraft; savedAt: number }
      | OnboardingDraft;
    // Back-compat: older drafts were stored without a wrapper.
    if (parsed && typeof parsed === "object" && "draft" in parsed && "savedAt" in parsed) {
      if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
        clearOnboardingDraft();
        return null;
      }
      return parsed.draft;
    }
    return parsed as OnboardingDraft;
  } catch {
    return null;
  }
};

export const clearOnboardingDraft = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  photoFile = null;
};
