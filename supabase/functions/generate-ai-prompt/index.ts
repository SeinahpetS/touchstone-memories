// Generate a single warm, contextual follow-up question via Anthropic Claude.
// Called after a Touchstone is saved.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a gentle, warm interviewer helping someone deepen a personal memory they just captured for their living archive. Read the memory context they provide and respond with EXACTLY ONE short, specific, open-ended question that invites them to add the small detail or feeling that would make this memory richer for them later.

Rules:
- One question only. No preamble, no closing line, no quotes.
- Maximum 18 words.
- Warm, curious, never clinical or therapeutic.
- Specific to the details they shared — never generic.
- Never ask about people they didn't mention.
- Never moralize, console, or give advice.
- Plain sentence. No emoji. No markdown.`;

interface MemoryContext {
  category?: string;
  title?: string | null;
  note?: string | null;
  emotional_tone?: string | null;
  who_was_there?: string | null;
  connected_to?: string | null;
  location_name?: string | null;
  when_text?: string | null;
  memory_year?: number | null;
}

function buildUserMessage(m: MemoryContext): string {
  const lines: string[] = [];
  if (m.category) lines.push(`Category: ${m.category}`);
  if (m.title) lines.push(`Title: ${m.title}`);
  if (m.when_text) lines.push(`When: ${m.when_text}`);
  else if (m.memory_year) lines.push(`When: ${m.memory_year}`);
  if (m.location_name) lines.push(`Where: ${m.location_name}`);
  if (m.who_was_there) lines.push(`Who was there: ${m.who_was_there}`);
  if (m.connected_to) lines.push(`Connected to: ${m.connected_to}`);
  if (m.emotional_tone) lines.push(`How it feels: ${m.emotional_tone}`);
  if (m.note) lines.push(`Note: ${m.note}`);
  return `Memory just captured:\n${lines.join("\n")}\n\nReturn one warm follow-up question.`;
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

    const body = await req.json().catch(() => ({}));
    const memory: MemoryContext = body?.memory ?? {};
    if (!memory || typeof memory !== "object") {
      return new Response(JSON.stringify({ error: "Missing memory context" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = buildUserMessage(memory);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 80,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
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
