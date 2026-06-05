## Context

This Lovable project is wired to the **Lovable Cloud–managed** Supabase project (ref `molmsqlnngtusxeggeij`, URL `https://molmsqlnngtusxeggeij.supabase.co`). All your app data — `profiles`, `story_sessions`, `touchstones`, `events`, storage buckets, edge functions — lives there. Your self-owned "touchstone" Supabase project has never been connected, which is why it looks empty.

**Hard constraint:** Lovable Cloud cannot be disconnected from a project once enabled, and rolling back to a pre-Cloud version does not undo it. So this project itself cannot be re-pointed at your own Supabase. The clean path is: export everything out of Cloud, import into your Supabase, then (when you're ready) create a fresh Lovable project with Cloud disabled and wire it to your Supabase.

This plan covers **the export half only** — done from inside this project, no app changes, no risk to live data.

## What I'll produce in `/mnt/documents/touchstone-export/`

1. **`schema.sql`** — full Postgres dump of the `public` schema:
   - All tables (`profiles`, `story_sessions`, `touchstones`, `events`) with columns, defaults, constraints
   - The `app_role` / category enums
   - All RLS policies
   - All `GRANT`s
   - Database functions (`has_active_vivid`, `handle_new_user`, `set_story_session_defaults`, `set_default_trial`, `prevent_profile_billing_updates`)
   - Triggers
2. **`data/`** — one CSV per table with every row (`profiles.csv`, `story_sessions.csv`, `touchstones.csv`, `events.csv`).
3. **`storage-manifest.json`** — listing of objects in the `avatars`, `exports`, and `memory-photos` buckets so you can re-download and re-upload them on the other side.
4. **`edge-functions/`** — copies of each `supabase/functions/*/index.ts` plus a short README mapping which secrets each function needs (so you know what to set in your own project's Edge Function secrets).
5. **`README.md`** — step-by-step import instructions for your own Supabase project:
   - Run `schema.sql` in the SQL editor
   - `COPY ... FROM` each CSV (with notes on auth.users — see caveats)
   - Recreate the 3 storage buckets and re-upload from the manifest
   - Redeploy edge functions and re-add the secrets they need (Anthropic, Stripe, Spotify, TMDB, Listen Notes, Resend, Lovable AI, Google)

## Caveats I'll flag in the README

- **`auth.users` cannot be exported/imported as plain rows** (password hashes, identities, etc. live in protected schemas). For a real cutover you either (a) keep the same user IDs and have Supabase support migrate auth, or (b) have users re-sign-up and re-link by email. `profiles.id` is the auth user id — re-importing profiles without matching auth.users will leave them orphaned until users sign up again.
- **Storage object bytes** must be downloaded client-side (signed URLs) — I'll generate a download script, but actual file transfer happens on your machine, not in the sandbox.
- **Lovable AI Gateway** (`LOVABLE_API_KEY`) only works on Lovable-hosted projects. On your own Supabase you'll need to swap calls to Anthropic/OpenAI/Google directly using your own API keys.
- **Stripe webhooks** point at the current Cloud edge function URL — you'll need to update the webhook endpoint in Stripe after cutover.

## Technical steps (what I'll run after approval)

1. `psql` against the Cloud DB (env vars already present):
   - `pg_dump --schema-only --schema=public` → `schema.sql`
   - `\copy (SELECT * FROM <table>) TO '...csv' WITH CSV HEADER` for each table
2. Use the Supabase Storage API with the service role key to list objects in each bucket → `storage-manifest.json` + a `download-storage.sh` script you run locally.
3. Copy `supabase/functions/*/index.ts` into the export folder and grep each file for `Deno.env.get(...)` calls to build the per-function secret list.
4. Write the README tying it all together.

## What this plan does NOT do

- Does not modify the running app
- Does not touch the Cloud-managed database
- Does not create a new Lovable project (you'll do that when ready, with Cloud disabled, and remix/rebuild against your own Supabase)
- Does not migrate `auth.users` automatically

After you've confirmed the export looks complete on your end, we can talk about the second half (spinning up a fresh Lovable project pointed at your own Supabase and porting the UI code over).
