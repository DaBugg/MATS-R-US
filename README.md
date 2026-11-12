# MATS-R-US — Shared PBAU inventory

Mats-R-Us shows construction-site materials by location. The public site reads
from a shared Neon Postgres database. Writes from the site and Dot use protected
server endpoints, so stock changes appear across browsers.

## Official stock

The repository PBAU seed is the official starting snapshot. It contains 55
source lines and 54 unique material/location rows: two 50-piece Deck entries
for 4 in. PVC 45s are combined into one 100-piece row. Run
`supabase/sql/11_activate_pbau.sql` once on a Neon database that already has
`01_schema.sql` and floor locations. The script archives existing demo records
under `mats_archive`, installs unique constraints, and creates an atomic stock
write function. Then run `supabase/sql/12_expand_locations_to_25.sql` to show
Floors 1–25, Deck, and Garage under storage. Verify counts before pointing
Production at that database.

## Deployment

Vercel needs three server-only sensitive environment variables in Production
and Preview: `DATABASE_URL`, `EDITOR_WRITE_TOKEN`, and `DOT_WRITE_TOKEN`.
Use separate random write tokens of at least 32 characters. Never expose them
with a `VITE_` prefix. `DATABASE_URL` is used only by server functions.

Anyone with the public URL can view stock without a Vercel login. A site editor
enters the editor key on the first write; it remains in that tab's session.
Dot receives only its narrow stock-change token and must request approval for
each change. Local Codex tasks use the ignored `.env.local` bridge described in
[Dot inventory connection](docs/dot-inventory.md).

## Development

```bash
npm install
npm run dev
```

The Vite frontend needs a Vercel-compatible server to use `/api/*` locally.
`npm run build` validates the frontend bundle. The database schema and import
scripts are under `supabase/sql/`.
