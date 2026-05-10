# Database Migration TODO

Notes captured during the Locations-first reformat (May 2026). The current
schema is intentionally kept stable — these are migrations to consider when
the relevant features ship.

---

## 1. `materials.category`

**Why:** the inventory page's Category filter and the Add Material form's
Category dropdown are both proposed in the reformat brief but currently
disabled. Adding a category column unlocks both.

```sql
alter table public.materials
  add column category text;

create index materials_category_idx on public.materials (category);
```

Suggested category enum (kept text + check, not a true enum, so additions
don't require a migration):

```
Framing | Drywall | Electrical | Plumbing | HVAC | Concrete | Roofing |
Flooring | Doors / Windows | Tools | Safety | Other
```

---

## 2. `materials.sku`

**Why:** the brief mentions search by SKU. Easy add.

```sql
alter table public.materials
  add column sku text unique;

create index materials_sku_idx on public.materials (sku);
```

---

## 3. `inventory_transactions` (proper movement log)

**Why:** today the `useInventoryActions` hook performs add / subtract / move
operations as direct mutations on `inventory_items.quantity`. There's no
history. The brief asks for a `/movements` log + per-item recent activity.

```sql
create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid references public.inventory_items (id) on delete set null,
  material_id uuid references public.materials (id) on delete restrict,
  from_location_id uuid references public.locations (id),
  to_location_id uuid references public.locations (id),
  quantity numeric not null check (quantity > 0),
  transaction_type text not null check (
    transaction_type in ('add', 'subtract', 'move', 'correction')
  ),
  reason text,
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create index inventory_transactions_material_idx
  on public.inventory_transactions (material_id, created_at desc);

create index inventory_transactions_location_idx
  on public.inventory_transactions (to_location_id, created_at desc);

-- Don't forget to add it to the realtime publication:
alter publication supabase_realtime add table public.inventory_transactions;
```

When this table exists, update `useInventoryActions.js` so each call also
inserts a transaction row (ideally inside an RPC so the balance update +
log insert are one atomic operation).

---

## 4. `locations.parent_location_id`

**Why:** for hierarchical locations like "Floor 12 → Room 214 → East Wing".
Today every location is flat. The brief mentions wings, rooms, and staging
areas as future categories.

```sql
alter table public.locations
  add column parent_location_id uuid references public.locations (id);
```

---

## 5. Optional: `materials.minimum_quantity`

Per-material low-stock threshold to replace the current global `< 10`
heuristic in `src/lib/inventoryStatus.js`.

```sql
alter table public.materials
  add column minimum_quantity numeric;
```

---

## How to apply

These can ship independently. Add the chosen migration as a new file in
`supabase/sql/` (e.g. `10_add_categories.sql`) and run it through the
Supabase SQL editor. None of the above should break existing rows.
