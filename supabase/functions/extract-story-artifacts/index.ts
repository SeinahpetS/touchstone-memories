import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `You are a warm, careful memory archivist. A user has shared a personal memory with you. Your job is to extract discrete memory artifacts from their story. Always extract one Moment first — this is the anchor of the story. Then extract any Objects, Places, People, Food, or Sound artifacts that appear in the story. Return only a JSON array. Each artifact should have: category (moment / object / place / person / food / sound), title (short, human, 2–5 words), and note (one warm sentence capturing the meaning, written in second person as if speaking to the user). The Moment always appears first in the array. Never extract more than 6 artifacts total. Never add artifacts that are not clearly present in the story.`;

const VALID_CATEGORIES = new Set(["moment", "object", "place", "person", "food", "sound"]);

function extractJsonArray(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {
    // Fallback: pull the first [...] block
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("No JSON array found in model output");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("Touchtone_Anthopic_API_Key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Anthropic API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { story } = await req.json().catch(() => ({}));
    if (typeof story !== "string" || story.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing story text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: story }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Upstream AI error", status: anthropicRes.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = await anthropicRes.json();
    const text: string = payload?.content?.[0]?.text ?? "";

    let parsed: unknown;
    try {
      parsed = extractJsonArray(text);
    } catch (e) {
      console.error("Parse error", e, "raw:", text);
      return new Response(
        JSON.stringify({ error: "Could not parse model output", raw: text }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!Array.isArray(parsed)) {
      return new Response(
        JSON.stringify({ error: "Model did not return an array" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const artifacts = (parsed as any[])
      .filter(
        (a) =>
          a &&
          typeof a === "object" &&
          typeof a.category === "string" &&
          VALID_CATEGORIES.has(a.category.toLowerCase()) &&
          typeof a.title === "string" &&
          typeof a.note === "string",
      )
      .map((a) => ({
        category: a.category.toLowerCase(),
        title: a.title.trim(),
        note: a.note.trim(),
      }))
      .slice(0, 6);

    if (artifacts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No artifacts extracted" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ensure a Moment leads if present
    const momentIdx = artifacts.findIndex((a) => a.category === "moment");
    if (momentIdx > 0) {
      const [m] = artifacts.splice(momentIdx, 1);
      artifacts.unshift(m);
    }

    return new Response(JSON.stringify({ artifacts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-story-artifacts error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
