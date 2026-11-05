import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { cityFields, confidentCity, MIN_CITY_CHARACTERS, MAX_CITY_SUGGESTIONS } from './city.ts';

const schema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('resolve') }),
  z.object({ mode: z.literal('autocomplete'), input: z.string().trim().max(200), sessionToken: z.string().uuid() }),
  z.object({ mode: z.literal('details'), placeId: z.string().regex(/^[A-Za-z0-9_-]{1,255}$/), sessionToken: z.string().uuid() }),
]);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const MASK = 'id,displayName,formattedAddress,addressComponents,types';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in required' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !user || user.is_anonymous) return json({ error: 'Sign in required' }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) return json({ error: 'Google Places key is not configured' }, 503);
    const google = async (path: string, init: RequestInit = {}) => {
      const response = await fetch(`https://places.googleapis.com/v1/${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, ...init.headers } });
      if (!response.ok) {
        const details = await response.text();
        console.error(`Google Places [${response.status}]: ${details}`);
        let message = 'Google Places request failed';
        if (response.status === 403) {
          message = 'Google Places denied the request. Check the server key restrictions and enable Places API (New) in Google Cloud Console.';
          if (details.includes('API_KEY_HTTP_REFERRER_BLOCKED')) message = 'Set the server key application restrictions to None or IP addresses in Google Cloud Console; keep browser keys referrer-restricted.';
          if (details.includes('API_KEY_SERVICE_BLOCKED')) message = 'Add Places API (New) to the server key allowed APIs in Google Cloud Console.';
        }
        throw { status: response.status, details, message };
      }
      return response.json();
    };
    const body = parsed.data;
    if (body.mode === 'autocomplete') {
      if (body.input.length < MIN_CITY_CHARACTERS) return json({ predictions: [] });
      const result = await google('places:autocomplete', {
        method: 'POST', headers: { 'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text' },
        body: JSON.stringify({ input: body.input, includedPrimaryTypes: ['(cities)'], sessionToken: body.sessionToken }),
      });
      return json({ predictions: (result.suggestions ?? []).filter((s: any) => s.placePrediction).slice(0, MAX_CITY_SUGGESTIONS).map((s: any) => ({ place_id: s.placePrediction.placeId, description: s.placePrediction.text?.text ?? '' })) });
    }
    if (body.mode === 'details') {
      const place = await google(`places/${encodeURIComponent(body.placeId)}?sessionToken=${encodeURIComponent(body.sessionToken)}`, { headers: { 'X-Goog-FieldMask': MASK } });
      if (!place.types?.some((t: string) => ['locality', 'postal_town', 'administrative_area_level_3'].includes(t))) return json({ error: 'Select a city' }, 400);
      return json(cityFields(place));
    }
    const { data: profile, error: readError } = await client.from('profiles').select('city,place_id,city_lookup_done').eq('id', user.id).single();
    if (readError) throw readError;
    if (!profile?.city?.trim() || profile.place_id || profile.city_lookup_done) return json({ resolved: false });
    // Claim the lookup before the paid call so concurrent archive loads and retries cannot repeat it.
    const { data: claimed, error: claimError } = await client.from('profiles').update({ city_lookup_done: true }).eq('id', user.id).eq('city_lookup_done', false).eq('city', profile.city).select('id');
    if (claimError) throw claimError;
    if (!claimed?.length) return json({ resolved: false });
    const result = await google('places:searchText', {
      method: 'POST', headers: { 'X-Goog-FieldMask': `places.${MASK.split(',').join(',places.')}` },
      body: JSON.stringify({ textQuery: profile.city, includedType: 'locality', strictTypeFiltering: true, pageSize: 5 }),
    });
    const match = confidentCity(profile.city, result.places ?? []);
    if (!match) return json({ resolved: false });
    const { error: saveError } = await client.from('profiles').update(match).eq('id', user.id).eq('city', profile.city).is('place_id', null);
    if (saveError) throw saveError;
    return json({ resolved: true });
  } catch (error: any) {
    return json({ error: error.message ?? 'City lookup failed', details: error.details, status: error.status }, error.status ?? 500);
  }
});