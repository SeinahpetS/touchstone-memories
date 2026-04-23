import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget analytics event logger.
 * Writes to public.events; silently no-ops if the user isn't signed in.
 */
export async function logEvent(
  eventType: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;
    await (supabase as any).from("events").insert({
      user_id: user.id,
      event_type: eventType,
      data,
    });
  } catch {
    // analytics must never break the app
  }
}
