import { supabase } from "@/integrations/supabase/client";
import { markOnboardingComplete } from "@/components/OnboardingDotIndicator";
import { clearOnboardingDraft, loadOnboardingDraft } from "@/lib/onboardingDraft";

/**
 * Signed-in onboarding: the answers go straight to the profile instead of
 * waiting for an account to be created. Writes the name, birth year and the
 * city answer only — never coordinates.
 */
export async function saveOnboardingAnswersToProfile(userId: string): Promise<void> {
  const draft = loadOnboardingDraft();
  const patch: Record<string, unknown> = { onboarding_complete: true };
  const firstName = draft?.firstName?.trim();
  if (firstName) {
    patch.first_name = firstName;
    patch.name = firstName;
  }
  if (draft?.birthMonth) patch.birth_month = draft.birthMonth;
  if (draft?.birthYear) patch.birth_year = draft.birthYear;
  const city = draft?.city?.trim();
  if (city) {
    patch.city = city;
    patch.location_display = draft?.locationDisplay?.trim() || city;
    patch.region = draft?.region?.trim() || null;
    patch.country = draft?.country?.trim() || null;
    patch.place_id = draft?.placeId ?? null;
  }
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
  markOnboardingComplete();
  clearOnboardingDraft();
}
