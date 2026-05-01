// Listen Notes podcast search proxy.
// GET ?q=...                       → { items: [{ id, title, publisher, image, listennotes_url }] }
// GET ?podcast_id=...              → { episodes: [{ id, title, pub_date_ms, listennotes_url }], podcast: {...} }
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("LISTEN_NOTES_API_KEY");
    if (!apiKey) return json({ error: "Listen Notes key not configured" }, 500);

    const url = new URL(req.url);
    const podcastId = url.searchParams.get("podcast_id")?.trim();
    const q = url.searchParams.get("q")?.trim();

    // --- Fetch podcast detail + recent episodes ---
    if (podcastId) {
      const r = await fetch(
        `https://listen-api.listennotes.com/api/v2/podcasts/${encodeURIComponent(
          podcastId
        )}?sort=recent_first`,
        { headers: { "X-ListenAPI-Key": apiKey } }
      );
      if (!r.ok) {
        const txt = await r.text();
        return json({ error: `Listen Notes failed: ${r.status} ${txt}` }, 502);
      }
      const data = await r.json();
      const episodes = (data.episodes ?? []).slice(0, 15).map((e: any) => ({
        id: e.id,
        title: e.title,
        pub_date_ms: e.pub_date_ms,
        listennotes_url: e.listennotes_url,
        image: e.image ?? e.thumbnail ?? null,
      }));
      return json({
        podcast: {
          id: data.id,
          title: data.title,
          publisher: data.publisher,
          image: data.image ?? data.thumbnail ?? null,
          listennotes_url: data.listennotes_url,
        },
        episodes,
      });
    }

    // --- Search podcasts ---
    if (!q || q.length < 2) return json({ items: [] });

    const searchUrl = new URL(
      "https://listen-api.listennotes.com/api/v2/search"
    );
    searchUrl.searchParams.set("q", q);
    searchUrl.searchParams.set("type", "podcast");

    const r = await fetch(searchUrl.toString(), {
      headers: { "X-ListenAPI-Key": apiKey },
    });
    if (!r.ok) {
      const txt = await r.text();
      return json({ error: `Listen Notes failed: ${r.status} ${txt}` }, 502);
    }
    const data = await r.json();
    const items = (data.results ?? []).slice(0, 10).map((p: any) => ({
      id: p.id,
      title: (p.title_original || p.title_highlighted || "").replace(
        /<\/?em>/g,
        ""
      ),
      publisher: (p.publisher_original || p.publisher_highlighted || "").replace(
        /<\/?em>/g,
        ""
      ),
      image: p.image ?? p.thumbnail ?? null,
      listennotes_url: p.listennotes_url,
    }));

    return json({ items });
  } catch (err) {
    console.error("search-podcasts error", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
