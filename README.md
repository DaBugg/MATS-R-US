# MATS-R-US — SNL Inventory MVP

A simple, database-driven construction-site inventory tracker.

> **One question, fast answer:** *What material do we have, and where is it?*

The job site has up to 21 floors plus a Connex storage box. This app shows what
material is on each floor (or in the Connex), supports inline editing, location-
specific search, and live multi-window updates via Supabase Realtime.

## Tech stack

- **React 19** + **Vite 8**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **Supabase** (Postgres + Realtime)
- Deploy target: **Vercel**

## Project layout

```text
.
├── index.html
├── vite.config.js
├── package.json
├── .env.example                ← copy to .env.local with your Supabase keys
├── supabase/
│   ├── README.md               ← how to run the SQL files
│   └── sql/
│       ├── 01_schema.sql
│       ├── 02_triggers.sql
│       ├── 03_realtime.sql
│       ├── 04_rls.sql
│       └── 05_seed.sql
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   └── supabaseClient.js
    ├── hooks/
    │   ├── useLocations.js
    │   ├── useInventory.js
    │   ├── useMaterials.js
    │   └── useSuppliers.js
    └── components/
        ├── BuildingMap.jsx
        ├── InventoryPanel.jsx
        ├── InventoryRow.jsx
        ├── AddInventoryRow.jsx
        └── SearchInput.jsx
```

## Data model (4 tables)

| Table             | Purpose                                                |
| ----------------- | ------------------------------------------------------ |
| `locations`       | Floors + storage areas (Connex Box). Database-driven.  |
| `suppliers`       | Supplier master list.                                   |
| `materials`       | Master material list (one row per distinct material).  |
| `inventory_items` | Quantity of a material at a specific location.         |

The same material can live in many locations — that's why `inventory_items`
joins `materials` × `locations` rather than duplicating material names.

## Getting started

### 1. Create the Supabase backend

Open your Supabase project's SQL editor and run, in order:

1. `supabase/sql/01_schema.sql`
2. `supabase/sql/02_triggers.sql`
3. `supabase/sql/03_realtime.sql`
4. `supabase/sql/04_rls.sql`
5. `supabase/sql/05_seed.sql`

See [`supabase/README.md`](./supabase/README.md) for details.

### 2. Configure environment

```bash
cp .env.example .env.local
# then edit .env.local and paste your Supabase URL + anon key
```

### 3. Install + run

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

## What's included in this MVP

- Database-driven floor / Connex visualization (no hard-coded floor list)
- Inventory CRUD (add, inline edit, delete) per location
- Location-specific search (search runs only inside the selected location)
- Decimal quantities; units; supplier dropdown
- Master materials list with create-or-select on add
- Supabase Realtime — changes appear instantly across browser windows

## What's intentionally NOT in this MVP

Auth, role permissions, multiple sites/projects, low-stock alerts, movement logs,
worker carts, photo uploads, CSV exports, PO automation, barcode/QR scanning,
mobile-first design, offline mode. See section 5.2 of the build plan.

## Security warning

The MVP RLS policies allow **public** read/write through the anon key. This is
fine for private testing only. **Do not share the production URL** until proper
auth and policies are added.
