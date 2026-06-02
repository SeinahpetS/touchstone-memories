import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const VALID_CATEGORIES = new Set([
  "moment",
  "person",
  "object",
  "place",
  "food",
  "sound",
  "imprint",
]);

function buildSystemPrompt(cap: number, excludeTitles: string[] = []) {
  const excludeBlock = excludeTitles.length
    ? `

ALREADY EXTRACTED — DO NOT REPEAT these titles or anything that would clearly duplicate them. Look harder for what is *new* in the transcript:
${excludeTitles.map((t) => `- ${t}`).join("\n")}`
    : "";

  return `You are a warm, careful memory archivist. A user has shared a personal memory transcript with you. Your job is to extract discrete, meaningful memory artifacts from their story.

CATEGORIES (use exactly these): Moment, Person, Object, Place, Food, Sound, Imprint.

RULES:
- ${excludeTitles.length ? "Surface NEW artifacts that were missed on the first pass. A second Moment is fine only if it is clearly distinct." : "Always extract a Moment artifact FIRST — it is the anchor of the story."}
- Extract only artifacts that are clearly present in the transcript. Never invent.
- Return AT MOST ${cap} artifacts total. Fewer is fine.
- For each artifact return: category, title (2–5 words, human, warm), note (one warm sentence in second person), and source_phrase (the EXACT substring from the transcript that triggered this artifact, copied verbatim so it can be highlighted).
- Respond with STRICT JSON ONLY. No preamble. No markdown. No code fences.${excludeBlock}

JSON SHAPE:
{
  "artifacts": [
    {
      "category": "Moment",
      "title": "Sunday visits to grandmother's house",
      "note": "Every Sunday after church, driving out to the yellow house on Elm Street.",
      "source_phrase": "Every Sunday we'd drive out there after church"
    }
  ]
}`;
}

function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch (_) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("No JSON object found in model output");
  }
}

function findSpan(transcript: string, phrase: string): { start: number; end: number } | null {
  if (!phrase) return null;
  const lowerT = transcript.toLowerCase();
  const lowerP = phrase.toLowerCase();
  const idx = lowerT.indexOf(lowerP);
  if (idx === -1) return null;
  return { start: idx, end: idx + phrase.length };
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const existingSessionId: string | undefined = body?.session_id;
    let transcript: string = (body?.transcript ?? body?.story ?? "").toString();
    const clientExclude: string[] = Array.isArray(body?.exclude_titles)
      ? body.exclude_titles.filter((s: unknown): s is string => typeof s === "string")
      : [];

    // Determine tier — Vivid = 7, Free = 5
    const { data: isVividData } = await supabase.rpc("has_active_vivid", { _user_id: userId });
    const isVivid = Boolean(isVividData);
    const cap = isVivid ? 7 : 5;

    // If continuing an existing session, fetch transcript + previously extracted titles
    let existingArtifacts: any[] = [];
    let existingSpans: any[] = [];
    let excludeTitles: string[] = [...clientExclude];

    if (existingSessionId) {
      const { data: sess, error: sessErr } = await supabase
        .from("story_sessions")
        .select("transcript, extracted_artifacts, highlight_spans")
        .eq("id", existingSessionId)
        .single();
      if (sessErr || !sess) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      transcript = sess.transcript ?? transcript;
      existingArtifacts = Array.isArray(sess.extracted_artifacts) ? sess.extracted_artifacts : [];
      existingSpans = Array.isArray(sess.highlight_spans) ? sess.highlight_spans : [];
      const prevTitles = existingArtifacts
        .map((a: any) => (typeof a?.title === "string" ? a.title : ""))
        .filter(Boolean);
      excludeTitles = Array.from(new Set([...excludeTitles, ...prevTitles]));
    }

    if (!transcript || transcript.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing transcript" }), {
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
        max_tokens: 1500,
        system: buildSystemPrompt(cap, excludeTitles),
        messages: [{ role: "user", content: transcript }],
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

    let parsed: any;
    try {
      parsed = extractJson(text);
    } catch (e) {
      console.error("Parse error", e, "raw:", text);
      return new Response(
        JSON.stringify({ error: "Could not parse model output", raw: text }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawArtifacts: any[] = Array.isArray(parsed?.artifacts)
      ? parsed.artifacts
      : Array.isArray(parsed)
        ? parsed
        : [];

    let artifacts = rawArtifacts
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
        title: String(a.title).trim(),
        note: String(a.note).trim(),
        source_phrase:
          typeof a.source_phrase === "string" ? a.source_phrase.trim() : "",
      }));

    // Drop anything that obviously matches an already-known title
    const lowerExclude = new Set(excludeTitles.map((t) => t.toLowerCase()));
    artifacts = artifacts.filter((a) => !lowerExclude.has(a.title.toLowerCase()));

    if (artifacts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No new artifacts found", artifacts: [], highlight_spans: [] }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // On a fresh pass, ensure a Moment leads. On a continuation, keep model order.
    if (!existingSessionId) {
      const momentIdx = artifacts.findIndex((a) => a.category === "moment");
      if (momentIdx > 0) {
        const [m] = artifacts.splice(momentIdx, 1);
        artifacts.unshift(m);
      }
    }

    // Enforce per-pass cap
    artifacts = artifacts.slice(0, cap);

    // Compute highlight spans (indexed against the merged artifact list)
    const indexOffset = existingArtifacts.length;
    const newSpans = artifacts
      .map((a, i) => {
        const span = findSpan(transcript, a.source_phrase);
        return span
          ? { artifact_index: indexOffset + i, ...span, phrase: a.source_phrase }
          : null;
      })
      .filter(Boolean);

    let sessionRow: any;

    if (existingSessionId) {
      const mergedArtifacts = [...existingArtifacts, ...artifacts];
      const mergedSpans = [...existingSpans, ...newSpans];
      const { data: updated, error: updateErr } = await supabase
        .from("story_sessions")
        .update({
          extracted_artifacts: mergedArtifacts,
          highlight_spans: mergedSpans,
        })
        .eq("id", existingSessionId)
        .select("id, title, expires_at, status")
        .single();
      if (updateErr) {
        console.error("story_sessions update error", updateErr);
        return new Response(
          JSON.stringify({ error: "Could not update session", detail: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      sessionRow = updated;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("story_sessions")
        .insert({
          user_id: userId,
          transcript,
          extracted_artifacts: artifacts,
          highlight_spans: newSpans,
          status: "incomplete",
        })
        .select("id, title, expires_at, status")
        .single();
      if (insertErr) {
        console.error("story_sessions insert error", insertErr);
        return new Response(
          JSON.stringify({ error: "Could not save session", detail: insertErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      sessionRow = inserted;
    }

    return new Response(
      JSON.stringify({
        session_id: sessionRow.id,
        title: sessionRow.title,
        status: sessionRow.status,
        expires_at: sessionRow.expires_at,
        artifacts,
        highlight_spans: newSpans,
        cap,
        tier: isVivid ? "vivid" : "free",
        continuation: Boolean(existingSessionId),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("extract-story-artifacts error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
