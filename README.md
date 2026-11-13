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

On the Locations page, empty Site Assets can be removed from view and restored
later in Manage locations. Assets with inventory cannot be removed until their
stock is moved or cleared.

## Development

```bash
npm install
npm run dev
```

The Vite frontend needs a Vercel-compatible server to use `/api/*` locally.
`npm run build` validates the frontend bundle. The database schema and import
scripts are under `supabase/sql/`.

## Drawing takeoff MVP

The Drawings screen accepts private PDF uploads up to 50 MB. In a takeoff,
PDF.js reads embedded text; scanned sheets can be processed with browser OCR.
The extracted text is stored per page as evidence. A reviewer marks materials
on the plan, matches each confirmed item to an existing catalog material, and
approves the takeoff. Order Sheets totals approved quantities and compares
them with live Neon stock, then exports shortages as CSV. Drawings and takeoffs
do not change inventory balances.

Before enabling these routes on Vercel:

1. Run `supabase/sql/13_plan_takeoff.sql` against the existing Neon database.
2. Connect a **private** Vercel Blob store to the project and configure
   `BLOB_READ_WRITE_TOKEN` for client upload tokens. Keep `DATABASE_URL` and
   `EDITOR_WRITE_TOKEN` configured as before.
3. Deploy the code, then verify upload, OCR, review, approval, and CSV export
   with a representative contractor PDF.

The current editor key protects all plan and takeoff API reads and writes.
Before customer drawings are exposed to multiple organizations, replace that
shared key with user and project permissions. The MVP has no reservations or
purchase order receipts, and drawing revisions must be checked for duplicates.

## Purchase order tracking

Apply `supabase/sql/14_purchase_orders.sql` to the existing Neon database before enabling PO writes. Order Sheets can save shortage quantities as a draft PO, mark it ordered, log partial deliveries with retry-safe receipt IDs, show overdue orders and delivery history, and deduct outstanding ordered quantities from new recommendations. Drafts and cancelled orders do not reduce recommendations. PO quantities are a saved snapshot; cancel and recreate a draft to revise its lines. POs with deliveries cannot be cancelled.

Delivery logging never updates inventory. Reconcile deliveries with approved stock updates before ordering again. Run `npm run test:purchasing` for isolated Postgres validation. See `docs/verification-2026-11-13.md` for real-PDF scanner evidence and remaining deployment gates.
