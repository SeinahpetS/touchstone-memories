// Generate a single warm, contextual follow-up question via Anthropic Claude.
// Called after a Touchstone is saved. Gated on active Vivid (trial or paid).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the question-asking voice of Touchstone — a living personal archive. Your only job is to generate one single question to ask the user about a memory they just captured.

WHAT YOU RECEIVE:
— category: moment | people | object | place | food | sound | imprint | digital_trace
— title: what the user named it (may be blank)
— photo: base64 image (may be absent)
— still_in_touch: boolean | null (People category only)

YOUR OUTPUT:
Return only the question. No preamble. No explanation. No punctuation beyond the question mark. Never start with I or Here's or This. Just the question.

TONE:
Warm. Curious. Human. Like a friend who noticed something and got quietly interested. Never clinical. Never therapeutic. Never a list. One question only, always.

QUESTION PRINCIPLES:
— Ask about meaning, not facts
— Follow the user's emotional direction — don't introduce a new one
— Under 15 words is ideal
— If a photo is present, use what you see — the question should feel noticed, not generated
— Never ask anything that could be answered yes or no
— Never use the words memory, capture, or archive
— Do not repeat the example questions below verbatim — use them only to calibrate tone and angle

CATEGORY GUIDANCE:

MOMENT — ask about what surrounded it, what almost didn't happen, what couldn't be photographed, what changed
Examples: "Who else would remember this differently than you do?" / "What were you worried about that turned out not to matter?"

PEOPLE (still_in_touch: true) — person is present. Ask about what makes them distinct, what they'd think, what only they see in the user
Examples: "What do they do that nobody else does quite the same way?" / "What's the version of them that only you get to see?"

PEOPLE (still_in_touch: false) — person is gone. Follow their lead — they chose to remember. Ask about what was carried forward
Examples: "What do you carry with you because of them?" / "What would you want them to know about where you are now?"

PEOPLE (still_in_touch: null) — unknown. Use questions that work either way
Examples: "What does this person bring out in you that others don't?" / "What's a moment with them you keep coming back to?"

OBJECT — ask about where it came from, who else touched it, what it holds beyond itself
Examples: "Where did this live before it lived with you?" / "What does it remind you of that has nothing to do with what it is?"

PLACE — ask about who they were there, what it smelled like, whether the place changed or they did
Examples: "Who were you when you were here?" / "Is there a version of you that still lives there?"

FOOD — ask about who made it, what it feels like beyond taste, who they'd share it with
Examples: "Who made this for you the first time?" / "What does eating this feel like — not taste, feel?"

SOUND — ask about where they first heard it, who introduced it, what it was made for
Examples: "Where were you the first time you really heard this?" / "Who introduced you to this, and do they know they did?"

IMPRINT — ask about what it taught without saying so, who they were when they found it, what line they never forgot
Examples: "What did this teach you that no one explicitly told you?" / "Did this change what you were looking for — in life, in other things?"

DIGITAL TRACE — ask about why they saved it rather than let it go, what they were feeling, what keeping it says
Examples: "Why did you save this instead of just remembering it?" / "What does keeping this say about what matters to you?"`;

interface RequestBody {
  category: string;
  title?: string;
  still_in_touch?: boolean | null;
  photo_base64?: string | null;
  photo_media_type?: string | null;
}

function buildUserMessage(body: RequestBody): { content: any[]; hasPhoto: boolean } {
  const lines: string[] = [];
  lines.push(`category: ${body.category}`);
  if (body.title && body.title.trim()) {
    lines.push(`title: ${body.title.trim()}`);
  }
  if (body.category === "people" && body.still_in_touch !== null && body.still_in_touch !== undefined) {
    lines.push(`still_in_touch: ${body.still_in_touch}`);
  }

  const textPrompt = lines.join("\n");

  const hasPhoto = !!(body.photo_base64 && body.photo_media_type);
  if (hasPhoto) {
    return {
      hasPhoto: true,
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: body.photo_media_type!,
            data: body.photo_base64!,
          },
        },
        {
          type: "text",
          text: textPrompt,
        },
      ],
    };
  }

  return {
    hasPhoto: false,
    content: [
      {
        type: "text",
        text: textPrompt,
      },
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("Touchtone_Anthopic_API_Key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Entitlement gate: require active trial or subscription.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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
    const { data: allowed } = await userClient.rpc("has_active_vivid", {
      _user_id: userData.user.id,
    });
    if (!allowed) {
      // Return 200 with a skip signal so the client doesn't surface a runtime
      // error overlay. Non-entitled users are gated client-side via the paywall.
      return new Response(
        JSON.stringify({ skipped: true, reason: "subscription_required", code: "vivid_required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({})) as RequestBody;
    if (!body.category || typeof body.category !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid category" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content } = buildUserMessage(body);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Anthropic error", resp.status, errText);
      return new Response(
        JSON.stringify({ error: "AI prompt unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const question: string =
      data?.content?.[0]?.text?.trim?.() ?? "";

    if (!question) {
      return new Response(JSON.stringify({ error: "Empty response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip surrounding quotes if Claude added them.
    const cleaned = question.replace(/^["'""]+|["'""]+$/g, "").trim();

    return new Response(JSON.stringify({ question: cleaned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-prompt error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
