import { supabase } from "@/integrations/supabase/client";

/** Create a sender-owned share; token, status, and expiry are database defaults. */
export async function createShare(
  touchstoneId: string,
  personId: string | null,
  includeNote: boolean,
  includeLocation = false,
): Promise<string> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sign in to share a touchstone.");

  const { data, error } = await supabase
    .from("touchstone_shares")
    .insert({
      from_user_id: auth.user.id,
      touchstone_id: touchstoneId,
      person_id: personId,
      include_note: includeNote,
      include_location: includeLocation,
    })
    .select("token")
    .single();
  if (error) throw error;
  if (!data?.token) throw new Error("The share token was not returned.");
  return data.token;
}