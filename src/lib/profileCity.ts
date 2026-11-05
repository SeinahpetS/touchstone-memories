import { supabase } from '@/integrations/supabase/client';
export type ProfileCity = { city: string; region: string | null; country: string | null; place_id: string | null; location_display: string };
export const freeTextCity = (text: string): ProfileCity => ({ city: text.trim(), region: null, country: null, place_id: null, location_display: text.trim() });
export async function resolveProfileCity() {
  const { error } = await supabase.functions.invoke('city-places', { body: { mode: 'resolve' } });
  // Optional enrichment must never block onboarding or archive entry.
  if (error) console.warn('Optional city matching unavailable:', error.message);
}