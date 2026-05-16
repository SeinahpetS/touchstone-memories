// Export the authenticated user's full Touchstone archive as JSON.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days
const PHOTO_BUCKET = "memory-photos";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function extractStoragePath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${PHOTO_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.substring(i + marker.length).split("?")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: rows, error: qErr } = await admin
      .from("touchstones")
      .select(
        "id, title, category, created_at, note, ai_prompt, ai_answer, people, who_was_there, is_private, photo_url",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (qErr) {
      console.error("touchstones query error", qErr);
      return new Response(JSON.stringify({ error: "Query failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const out = await Promise.all(
      (rows ?? []).map(async (r: any) => {
        let signed: string | null = null;
        const path = extractStoragePath(r.photo_url);
        if (path) {
          const { data: s } = await admin.storage
            .from(PHOTO_BUCKET)
            .createSignedUrl(path, SIGNED_URL_TTL);
          signed = s?.signedUrl ?? r.photo_url ?? null;
        } else if (r.photo_url) {
          signed = r.photo_url;
        }
        return {
          id: r.id,
          title: r.title,
          category: r.category,
          date: formatDate(r.created_at),
          note: r.note,
          ai_prompt: r.ai_prompt,
          ai_answer: r.ai_answer,
          person_association: r.people ?? r.who_was_there ?? null,
          private: r.is_private,
          photo_url: signed,
        };
      }),
    );

    return new Response(JSON.stringify(out), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="touchstone-export.json"',
      },
    });
  } catch (e) {
    console.error("generate-export error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
