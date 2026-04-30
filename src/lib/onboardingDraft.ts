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
  memoryDate: MemoryDate;
  /** Object URL for the in-memory photo, used for preview only. */
  photoPreview: string | null;
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
  memoryDate: emptyMemoryDate(),
  photoPreview: null,
});

export const saveOnboardingDraft = (draft: OnboardingDraft) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
};

export const loadOnboardingDraft = (): OnboardingDraft | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return null;
  }
};

export const clearOnboardingDraft = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  photoFile = null;
};
