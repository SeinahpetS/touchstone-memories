// TMDB search for movies and TV shows.
// GET ?q=...&type=movie|tv  →  { items: [{ id, type, title, subtitle, image, year }] }
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

const POSTER_BASE = "https://image.tmdb.org/t/p/w185";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("TMDB_API_KEY");
    if (!apiKey) return json({ error: "TMDB_API_KEY not configured" }, 500);

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const type = url.searchParams.get("type") === "tv" ? "tv" : "movie";
    if (!q || q.length < 2) return json({ items: [] });

    const endpoint = new URL(`https://api.themoviedb.org/3/search/${type}`);
    endpoint.searchParams.set("query", q);
    endpoint.searchParams.set("include_adult", "false");
    endpoint.searchParams.set("page", "1");

    // TMDB supports either v3 api_key query param or v4 Bearer token.
    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey.startsWith("eyJ")) {
      headers.Authorization = `Bearer ${apiKey}`;
    } else {
      endpoint.searchParams.set("api_key", apiKey);
    }

    const r = await fetch(endpoint.toString(), { headers });
    if (!r.ok) {
      const txt = await r.text();
      return json({ error: `TMDB search failed: ${r.status} ${txt}` }, 502);
    }
    const data = await r.json();

    const items: Array<{
      id: string;
      type: "movie" | "tv";
      title: string;
      subtitle: string;
      image: string | null;
      year: number | null;
    }> = [];

    for (const it of (data.results ?? []).slice(0, 8)) {
      const title = type === "movie" ? it.title : it.name;
      if (!title) continue;
      const date: string | undefined =
        type === "movie" ? it.release_date : it.first_air_date;
      const year = date && /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null;
      const subtitle = `${year ?? "—"} · ${type === "movie" ? "Film" : "TV Show"}`;
      items.push({
        id: String(it.id),
        type,
        title,
        subtitle,
        image: it.poster_path ? `${POSTER_BASE}${it.poster_path}` : null,
        year,
      });
    }

    return json({ items });
  } catch (err) {
    console.error("tmdb-search error", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
