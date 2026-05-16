// Generate user data export, upload to storage, email signed link via Resend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days
const PHOTO_BUCKET = "memory-photos";
const EXPORT_BUCKET = "exports";
const FROM_ADDRESS = "Touchstone <exports@usetouchstone.app>";

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
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const userEmail = userData.user.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "No email on account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Step 1: query memories
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

    const memories = await Promise.all(
      (rows ?? []).map(async (r: any) => {
        let signed: string | null = null;
        const path = extractStoragePath(r.photo_url);
        if (path) {
          const { data: s } = await admin.storage
            .from(PHOTO_BUCKET)
            .createSignedUrl(path, SIGNED_URL_TTL);
          signed = s?.signedUrl ?? null;
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

    const json = JSON.stringify(memories);

    // Step 2: upload to private exports bucket
    const timestamp = Date.now();
    const filePath = `${userId}/${timestamp}.json`;
    const { error: upErr } = await admin.storage
      .from(EXPORT_BUCKET)
      .upload(filePath, new Blob([json], { type: "application/json" }), {
        contentType: "application/json",
        upsert: false,
      });
    if (upErr) {
      console.error("export upload error", upErr);
      return new Response(JSON.stringify({ error: "Upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signedData, error: signErr } = await admin.storage
      .from(EXPORT_BUCKET)
      .createSignedUrl(filePath, SIGNED_URL_TTL);
    if (signErr || !signedData?.signedUrl) {
      console.error("signed url error", signErr);
      return new Response(JSON.stringify({ error: "Could not sign URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const downloadUrl = signedData.signedUrl;

    // Step 3: send via Resend
    const textBody = `Your archive is ready to download.

Download my archive: ${downloadUrl}

This link expires in 7 days.

The file also includes signed links to your photos — those expire in 7 days too. Save any photos you want to keep within that window.

— Touchstone`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [userEmail],
        subject: "Your Touchstone archive is ready",
        text: textBody,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend send failed", emailRes.status, errText);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-export error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
