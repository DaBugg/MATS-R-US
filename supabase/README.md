# Supabase Setup

Run these SQL files in order from the Supabase SQL editor (Project → SQL → New query):

1. `sql/01_schema.sql` — creates `locations`, `suppliers`, `materials`, `inventory_items`
2. `sql/02_triggers.sql` — adds `updated_at` auto-bump triggers
3. `sql/03_realtime.sql` — adds tables to the `supabase_realtime` publication
4. `sql/04_rls.sql` — enables RLS with public-CRUD policies (MVP-only, NOT production-secure)
5. `sql/05_seed.sql` — seeds 21 floors + Connex Box, placeholder suppliers, sample materials

## After running

1. Copy your project URL and anon key from **Project Settings → API**.
2. Create `.env.local` in the repo root (next to `package.json`):

   ```text
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

3. Restart `npm run dev`.

## Security notice

The MVP RLS policies in `04_rls.sql` allow **public** read/write through the anon key.
That's fine for a private testing URL — but **do not share the deployed URL publicly**
until proper auth and policies are added. See section 30 of the build plan for the
auth roadmap.
