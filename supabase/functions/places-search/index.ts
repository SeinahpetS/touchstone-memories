// Google Places proxy: keeps GOOGLE_API_KEY server-side.
// Supports two modes: ?mode=autocomplete&q=... and ?mode=details&place_id=...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth check — only signed-in users may use this proxy
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) return json({ error: "GOOGLE_API_KEY not configured" }, 500);

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "autocomplete";

    if (mode === "autocomplete") {
      const q = url.searchParams.get("q")?.trim();
      if (!q || q.length < 2) return json({ predictions: [] });

      const placesUrl = new URL(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json"
      );
      placesUrl.searchParams.set("input", q);
      placesUrl.searchParams.set("key", apiKey);

      const r = await fetch(placesUrl.toString());
      const data = await r.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return json({ error: data.error_message || data.status }, 502);
      }
      return json({
        predictions: (data.predictions ?? []).map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
          main_text: p.structured_formatting?.main_text ?? p.description,
          secondary_text: p.structured_formatting?.secondary_text ?? "",
        })),
      });
    }

    if (mode === "details") {
      const placeId = url.searchParams.get("place_id");
      if (!placeId) return json({ error: "Missing place_id" }, 400);

      const detailsUrl = new URL(
        "https://maps.googleapis.com/maps/api/place/details/json"
      );
      detailsUrl.searchParams.set("place_id", placeId);
      detailsUrl.searchParams.set("fields", "name,formatted_address,geometry");
      detailsUrl.searchParams.set("key", apiKey);

      const r = await fetch(detailsUrl.toString());
      const data = await r.json();
      if (data.status !== "OK") {
        return json({ error: data.error_message || data.status }, 502);
      }
      const result = data.result;
      return json({
        name: result.name ?? null,
        formatted_address: result.formatted_address ?? null,
        lat: result.geometry?.location?.lat ?? null,
        lng: result.geometry?.location?.lng ?? null,
      });
    }

    return json({ error: "Unknown mode" }, 400);
  } catch (err) {
    console.error("places-search error", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
