// Spotify search via client-credentials flow.
// GET ?q=...&type=track,album   →  { items: [{ id, type, title, subtitle, image }] }
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

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }
  const id = Deno.env.get("SPOTIFY_CLIENT_ID");
  const secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!id || !secret) throw new Error("Spotify credentials not configured");

  const basic = btoa(`${id}:${secret}`);
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error(`Spotify token failed: ${r.status}`);
  const data = await r.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

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

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const type = url.searchParams.get("type") || "track,album";
    if (!q || q.length < 2) return json({ items: [] });

    const token = await getSpotifyToken();

    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", q);
    searchUrl.searchParams.set("type", type);
    searchUrl.searchParams.set("limit", "8");

    const r = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      const txt = await r.text();
      return json({ error: `Spotify search failed: ${r.status} ${txt}` }, 502);
    }
    const data = await r.json();

    const items: Array<{
      id: string;
      type: "track" | "album";
      title: string;
      subtitle: string;
      image: string | null;
      uri: string;
    }> = [];

    for (const t of data.tracks?.items ?? []) {
      items.push({
        id: t.id,
        type: "track",
        title: t.name,
        subtitle: (t.artists ?? []).map((a: any) => a.name).join(", "),
        image: t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? null,
        uri: t.uri,
      });
    }
    for (const a of data.albums?.items ?? []) {
      items.push({
        id: a.id,
        type: "album",
        title: a.name,
        subtitle: (a.artists ?? []).map((x: any) => x.name).join(", "),
        image: a.images?.[1]?.url ?? a.images?.[0]?.url ?? null,
        uri: a.uri,
      });
    }

    return json({ items });
  } catch (err) {
    console.error("spotify-search error", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
