// Google Places proxy: keeps GOOGLE_API_KEY server-side.
// Uses Places API (New). Supports ?mode=autocomplete&q=... and ?mode=details&place_id=...
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
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) return json({ error: "GOOGLE_API_KEY not configured" }, 500);

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "autocomplete";

    if (mode === "autocomplete") {
      const q = url.searchParams.get("q")?.trim();
      const types = url.searchParams.get("types"); // e.g. "cities"
      if (!q || q.length < 2) return json({ predictions: [] });

      const body: Record<string, unknown> = { input: q };
      if (types === "cities") {
        body.includedPrimaryTypes = ["locality", "administrative_area_level_3"];
      }

      const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        return json(
          { error: data.error?.message || `Places API error (${r.status})` },
          502
        );
      }
      const suggestions = data.suggestions ?? [];
      return json({
        predictions: suggestions
          .filter((s: any) => s.placePrediction)
          .map((s: any) => {
            const p = s.placePrediction;
            return {
              place_id: p.placeId,
              description: p.text?.text ?? "",
              main_text: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
              secondary_text: p.structuredFormat?.secondaryText?.text ?? "",
            };
          }),
      });
    }

    if (mode === "details") {
      const placeId = url.searchParams.get("place_id");
      if (!placeId) return json({ error: "Missing place_id" }, 400);

      const r = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "id,displayName,formattedAddress,location,addressComponents",
          },
        }
      );
      const data = await r.json();
      if (!r.ok) {
        return json(
          { error: data.error?.message || `Places API error (${r.status})` },
          502
        );
      }
      const components: any[] = data.addressComponents ?? [];
      const findComp = (type: string, useShort = false) => {
        const c = components.find((c) => (c.types ?? []).includes(type));
        if (!c) return null;
        return useShort ? c.shortText ?? c.longText ?? null : c.longText ?? c.shortText ?? null;
      };
      return json({
        name: data.displayName?.text ?? null,
        formatted_address: data.formattedAddress ?? null,
        lat: data.location?.latitude ?? null,
        lng: data.location?.longitude ?? null,
        city: findComp("locality") ?? findComp("administrative_area_level_3") ?? findComp("postal_town"),
        region: findComp("administrative_area_level_1"),
        country: findComp("country"),
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
