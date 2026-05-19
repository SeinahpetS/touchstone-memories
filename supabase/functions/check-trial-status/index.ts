import { createClient } from "npm:@supabase/supabase-js@2";
import tzlookup from "npm:tz-lookup@6.1.25";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TRIAL_DURATION_DAYS = 7;

// Compute end-of-day-N in the given IANA timezone, returned as a UTC Date.
// "End of day N" = midnight at the start of day (N+1) local time.
function midnightAfterDays(start: Date, days: number, tz: string): Date {
  // Get the local Y-M-D of `start` in tz, then add `days` to get target local date
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(start);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const startLocal = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  startLocal.setUTCDate(startLocal.getUTCDate() + days);
  const targetY = startLocal.getUTCFullYear();
  const targetM = startLocal.getUTCMonth();
  const targetD = startLocal.getUTCDate();

  // Find the UTC instant whose local time in `tz` is targetY-M-D 00:00:00
  // Approximate via offset iteration (handles DST safely).
  let guess = new Date(Date.UTC(targetY, targetM, targetD, 0, 0, 0));
  for (let i = 0; i < 3; i++) {
    const localParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(guess);
    const lg = (t: string) => Number(localParts.find((p) => p.type === t)!.value);
    const localAsUTC = Date.UTC(
      lg("year"),
      lg("month") - 1,
      lg("day"),
      lg("hour") % 24,
      lg("minute"),
      lg("second"),
    );
    const targetAsUTC = Date.UTC(targetY, targetM, targetD, 0, 0, 0);
    const diff = targetAsUTC - localAsUTC;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }
  return guess;
}

function resolveTimezone(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "UTC";
  try {
    return tzlookup(lat, lng);
  } catch {
    return "UTC";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "lat, lng, timezone, trial_started_at, trial_ends_at, subscription_status, current_period_end, vivid_since",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tz = profile.timezone || resolveTimezone(profile.lat, profile.lng);
    const trialStart = profile.trial_started_at
      ? new Date(profile.trial_started_at)
      : new Date();
    const computedTrialEnd = midnightAfterDays(trialStart, TRIAL_DURATION_DAYS, tz);

    // Backfill timezone and refined trial_ends_at on the profile if needed
    const updates: Record<string, unknown> = {};
    if (!profile.timezone && tz) updates.timezone = tz;
    const storedEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
    if (!storedEnd || Math.abs(storedEnd.getTime() - computedTrialEnd.getTime()) > 60_000) {
      updates.trial_ends_at = computedTrialEnd.toISOString();
    }
    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from("profiles").update(updates).eq("id", user.id);
    }

    const now = new Date();
    const trialActive = computedTrialEnd.getTime() > now.getTime();
    const msRemaining = Math.max(0, computedTrialEnd.getTime() - now.getTime());
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    const subscriptionActive = ["active", "trialing", "past_due"].includes(
      profile.subscription_status ?? "",
    );

    return new Response(
      JSON.stringify({
        timezone: tz,
        trial: {
          startedAt: trialStart.toISOString(),
          endsAt: computedTrialEnd.toISOString(),
          active: trialActive,
          daysRemaining,
          durationDays: TRIAL_DURATION_DAYS,
        },
        subscription: {
          status: profile.subscription_status,
          active: subscriptionActive,
          currentPeriodEnd: profile.current_period_end,
          vividSince: profile.vivid_since,
        },
        hasAccess: trialActive || subscriptionActive,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("check-trial-status error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
