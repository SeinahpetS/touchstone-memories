// Permanently delete the authenticated user's account and all associated data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUCKETS = ["memory-photos", "avatars", "exports"];

async function deleteAllInBucket(admin: any, bucket: string, userId: string) {
  // Recursively list and remove every object under <userId>/...
  const walk = async (prefix: string) => {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 1000,
    });
    if (error || !data) return;
    const files: string[] = [];
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // Folders have null metadata
      if (item.id === null || item.metadata === null) {
        await walk(path);
      } else {
        files.push(path);
      }
    }
    if (files.length) {
      await admin.storage.from(bucket).remove(files);
    }
  };
  await walk(userId);
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

    // Delete storage objects across all buckets (best effort).
    for (const bucket of BUCKETS) {
      try {
        await deleteAllInBucket(admin, bucket, userId);
      } catch (e) {
        console.error(`Storage cleanup failed for ${bucket}:`, e);
      }
    }

    // Delete database rows.
    await admin.from("touchstones").delete().eq("user_id", userId);
    await admin.from("events").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);

    // Delete auth user last.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("delete-account error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Delete failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
