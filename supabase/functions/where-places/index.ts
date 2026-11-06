import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

// City-only Google autocomplete for the capture "Where?" row.
// Privacy: Google receives only the typed text and a random session token —
// no user ID, IP forwarding, cookies, headers from the caller, or coordinates.
// The search text is never logged.
const schema = z.object({ input: z.string().trim().min(2).max(120), sessionToken: z.string().uuid() });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in required' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } });
    const { data, error } = await client.auth.getClaims(authorization.slice(7));
    if (error || !data?.claims?.sub || data.claims.is_anonymous) return json({ error: 'Sign in required' }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: 'Invalid input' }, 400);
    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) return json({ error: 'Google Places key is not configured' }, 503);
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify({ input: parsed.data.input, includedPrimaryTypes: ['(cities)'], sessionToken: parsed.data.sessionToken }),
    });
    if (!response.ok) {
      console.error(`Google Places autocomplete failed [${response.status}]`);
      return json({ error: 'Google search failed', status: response.status }, response.status === 403 ? 403 : 502);
    }
    const result = await response.json();
    const places = (result.suggestions ?? []).map((s: any) => s.placePrediction).filter(Boolean).slice(0, 5)
      .map((p: any) => ({ placeId: p.placeId, main: p.structuredFormat?.mainText?.text ?? '', secondary: p.structuredFormat?.secondaryText?.text ?? '' }))
      .filter((p: any) => p.placeId && p.main);
    return json({ places });
  } catch {
    return json({ error: 'Google search failed' }, 500);
  }
});
