-- Seed: 21 floors + Connex Box, sample suppliers, sample materials/inventory.
-- Safe to run once. Re-running will skip rows that already exist.

-- ----------------------------------------------------------------------------
-- Locations: Floor 1..21 + Connex Box
-- ----------------------------------------------------------------------------
insert into public.locations (name, type, sort_order, is_active)
values
  ('Floor 1',  'floor',   1,   true),
  ('Floor 2',  'floor',   2,   true),
  ('Floor 3',  'floor',   3,   true),
  ('Floor 4',  'floor',   4,   true),
  ('Floor 5',  'floor',   5,   true),
  ('Floor 6',  'floor',   6,   true),
  ('Floor 7',  'floor',   7,   true),
  ('Floor 8',  'floor',   8,   true),
  ('Floor 9',  'floor',   9,   true),
  ('Floor 10', 'floor',   10,  true),
  ('Floor 11', 'floor',   11,  true),
  ('Floor 12', 'floor',   12,  true),
  ('Floor 13', 'floor',   13,  true),
  ('Floor 14', 'floor',   14,  true),
  ('Floor 15', 'floor',   15,  true),
  ('Floor 16', 'floor',   16,  true),
  ('Floor 17', 'floor',   17,  true),
  ('Floor 18', 'floor',   18,  true),
  ('Floor 19', 'floor',   19,  true),
  ('Floor 20', 'floor',   20,  true),
  ('Floor 21', 'floor',   21,  true),
  ('Connex Box', 'storage', 100, true)
on conflict do nothing;

-- If the site is currently only built up to Floor 17, mark Floors 18-21 inactive.
-- Comment out if all 21 floors are active.
-- update public.locations set is_active = false
-- where name in ('Floor 18', 'Floor 19', 'Floor 20', 'Floor 21');

-- ----------------------------------------------------------------------------
-- Suppliers (placeholders — replace with real suppliers later)
-- ----------------------------------------------------------------------------
insert into public.suppliers (name, is_active)
values
  ('Supplier A', true),
  ('Supplier B', true),
  ('Supplier C', true),
  ('Supplier D', true)
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- Sample materials (idempotent: only inserts if name not already present)
-- ----------------------------------------------------------------------------
insert into public.materials (name, default_unit, supplier_id)
select '1 1/2 inch PVC Pipe', 'pcs', s.id
from public.suppliers s
where s.name = 'Supplier A'
  and not exists (select 1 from public.materials m where m.name = '1 1/2 inch PVC Pipe');

insert into public.materials (name, default_unit, supplier_id)
select '2 inch PVC Coupling', 'pcs', s.id
from public.suppliers s
where s.name = 'Supplier B'
  and not exists (select 1 from public.materials m where m.name = '2 inch PVC Coupling');

insert into public.materials (name, default_unit, supplier_id)
select 'Copper Valve', 'pcs', s.id
from public.suppliers s
where s.name = 'Supplier C'
  and not exists (select 1 from public.materials m where m.name = 'Copper Valve');

-- ----------------------------------------------------------------------------
-- Sample inventory rows (only inserted if not already present for that location)
-- ----------------------------------------------------------------------------
insert into public.inventory_items (material_id, location_id, quantity, unit, supplier_id)
select m.id, l.id, 40.00, 'pcs', m.supplier_id
from public.materials m
join public.locations l on l.name = 'Floor 1'
where m.name = '1 1/2 inch PVC Pipe'
  and not exists (
    select 1 from public.inventory_items i
    where i.material_id = m.id and i.location_id = l.id
  );

insert into public.inventory_items (material_id, location_id, quantity, unit, supplier_id)
select m.id, l.id, 12.00, 'pcs', m.supplier_id
from public.materials m
join public.locations l on l.name = 'Connex Box'
where m.name = '2 inch PVC Coupling'
  and not exists (
    select 1 from public.inventory_items i
    where i.material_id = m.id and i.location_id = l.id
  );
