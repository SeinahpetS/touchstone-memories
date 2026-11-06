import { supabase } from "@/integrations/supabase/client";

export const ARCHIVE_PATH = "/archive";
export const ONBOARDING_NAME_PATH = "/onboarding-name";
export const PENDING_KEEP_KEY = "ts_pending_keep";

export function getPendingKeepRoute(): string | null {
  try {
    const token = localStorage.getItem(PENDING_KEEP_KEY);
    return token && /^[a-fA-F0-9]{48}$/.test(token) ? `/keep/${token}` : null;
  } catch { return null; }
}

const DRAFT_KEY = "ts_onboarding_draft_v1";
const STORY_DRAFT_KEY = "ts_onboarding_draft";
const COMPLETE_KEY = "ts_onboarding_complete";

/** Something is still waiting on this device to be moved into the account. */
export const hasOnboardingDraftWaiting = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem(DRAFT_KEY) || !!localStorage.getItem(STORY_DRAFT_KEY);
  } catch {
    return false;
  }
};

export const isOnboardingCompleteFlagged = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Where a signed-in user belongs.
 *
 * A profile with no city, no completion flag and nothing waiting on this
 * device means the account was created without ever answering the onboarding
 * questions, so they go back in at the name screen. Anything else — a stored
 * city, a completion flag, or a draft still to be moved — keeps them in the
 * archive.
 */
export async function resolvePostSignInPath(userId: string): Promise<string> {
  if (isOnboardingCompleteFlagged()) return getPendingKeepRoute() ?? ARCHIVE_PATH;
  if (hasOnboardingDraftWaiting()) return getPendingKeepRoute() ?? ARCHIVE_PATH;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("city, location_display")
      .eq("id", userId)
      .maybeSingle();
    if (error) return getPendingKeepRoute() ?? ARCHIVE_PATH;
    const city = (data?.city ?? "").trim();
    const locationDisplay = (data?.location_display ?? "").trim();
    if (city || locationDisplay) return getPendingKeepRoute() ?? ARCHIVE_PATH;
  } catch {
    // A failed read must never trap a signed-in user on a blank screen.
    return getPendingKeepRoute() ?? ARCHIVE_PATH;
  }
  return ONBOARDING_NAME_PATH;
}
