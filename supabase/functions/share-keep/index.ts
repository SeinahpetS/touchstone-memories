import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { keepShare, ShareError } from '../_shared/sharing.ts';

const schema = z.object({ token: z.string().regex(/^[a-fA-F0-9]{48}$/) });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !user || user.is_anonymous) return json({ error: 'unauthorized' }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: 'invalid_token' }, 400);
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({ error: 'unavailable' }, 503);
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    return json(await keepShare(admin, parsed.data.token, user.id, url));
  } catch (error) {
    return json({ error: error instanceof ShareError ? error.code : 'share_failed' }, error instanceof ShareError ? error.status : 500);
  }
});