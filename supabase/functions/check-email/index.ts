import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const schema = z.object({ email: z.string().trim().max(255).email() });
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Answers one question for the create-account screen: does this email already
// have an account? The lookup runs server-side with the service key, and the
// database function behind it is executable by service_role only.
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: 'Enter a valid email' }, 400);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data, error } = await admin.rpc('email_exists', { p_email: parsed.data.email });
    if (error) throw error;
    return json({ exists: data === true });
  } catch (error: any) {
    return json({ error: error.message ?? 'Email check failed' }, 500);
  }
});
