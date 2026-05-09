-- ============================================================================
-- 07_test_data.sql
--
-- Base testing data for the SNL Inventory MVP.
-- Idempotent — safe to re-run. Use this when you want a known-good state with
-- realistic plumbing inventory loaded across the North Tower.
--
-- After running this file you should see:
--   • 15 active floors (Floors 1-15) + Connex Box
--   • Floors 16-21 inactive (saved for future build-out)
--   • 4 suppliers
--   • 15 master materials
--   • ~28 inventory rows distributed across Floors 1-7 + Connex
--   • Floors 8-15 intentionally empty (the upper-level "not built yet" zone)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Set 15 active floors (matches the North Tower elevation artwork)
-- ----------------------------------------------------------------------------
update public.locations
set is_active = true
where type = 'floor' and sort_order between 1 and 15;

update public.locations
set is_active = false
where type = 'floor' and sort_order between 16 and 21;


-- ----------------------------------------------------------------------------
-- 2. Realistic suppliers (idempotent on unique name)
-- ----------------------------------------------------------------------------
insert into public.suppliers (name, is_active)
values
  ('Ferguson',        true),
  ('Home Depot Pro',  true),
  ('Reece',           true),
  ('Build.com Pro',   true)
on conflict (name) do nothing;


-- ----------------------------------------------------------------------------
-- 3. Master materials list (idempotent — only inserts if name not present)
-- ----------------------------------------------------------------------------
with material_data(name, default_unit, supplier_name) as (
  values
    ('1/2 inch Copper Pipe',         'ft',   'Ferguson'),
    ('3/4 inch Copper Pipe',         'ft',   'Ferguson'),
    ('1 inch Copper Pipe',           'ft',   'Ferguson'),
    ('1 1/2 inch Copper Pipe',       'ft',   'Ferguson'),
    ('1 1/2 inch PVC Pipe',          'pcs',  'Home Depot Pro'),
    ('2 inch PVC Pipe',              'pcs',  'Home Depot Pro'),
    ('3 inch PVC Pipe',              'pcs',  'Home Depot Pro'),
    ('1/2 inch Copper Elbow',        'pcs',  'Reece'),
    ('3/4 inch Copper Tee',          'pcs',  'Reece'),
    ('2 inch PVC Coupling',          'pcs',  'Home Depot Pro'),
    ('1/2 inch Ball Valve',          'pcs',  'Build.com Pro'),
    ('3/4 inch Gate Valve',          'pcs',  'Build.com Pro'),
    ('Solder Roll (lead-free)',      'roll', 'Reece'),
    ('Pipe Flux 8oz',                'jar',  'Reece'),
    ('3/4 inch SharkBite Coupling',  'pcs',  'Build.com Pro'),
    ('1/2 inch Pipe Clamp',          'box',  'Home Depot Pro'),
    ('Teflon Tape Roll',             'roll', 'Home Depot Pro'),
    ('Plumbers Putty 14oz',          'jar',  'Reece')
)
insert into public.materials (name, default_unit, supplier_id)
select md.name, md.default_unit, s.id
from material_data md
left join public.suppliers s on s.name = md.supplier_name
where not exists (
  select 1 from public.materials m where m.name = md.name
);


-- ----------------------------------------------------------------------------
-- 4. Inventory distribution
--    Floors 1-7: real material on site (varied — busy floors)
--    Floors 8-15: intentionally empty (not built/plumbed yet)
--    Connex Box: deeper stockpile of bulk material
--
--    Idempotent — only inserts if (material, location) pair doesn't exist yet.
-- ----------------------------------------------------------------------------
with inv_data(material_name, location_name, quantity, unit) as (
  values
    -- ---- Floor 1: punch-list / final fixtures ----------------------------
    ('1/2 inch Copper Pipe',         'Floor 1', 120.00, 'ft'),
    ('3/4 inch Copper Pipe',         'Floor 1',  60.00, 'ft'),
    ('1/2 inch Copper Elbow',        'Floor 1',  24.00, 'pcs'),
    ('3/4 inch Copper Tee',          'Floor 1',  16.00, 'pcs'),
    ('Solder Roll (lead-free)',      'Floor 1',   2.00, 'roll'),

    -- ---- Floor 2: rough-in DWV ------------------------------------------
    ('1 1/2 inch PVC Pipe',          'Floor 2',  30.00, 'pcs'),
    ('2 inch PVC Pipe',              'Floor 2',  22.00, 'pcs'),
    ('2 inch PVC Coupling',          'Floor 2',  18.00, 'pcs'),

    -- ---- Floor 3: water main run ----------------------------------------
    ('1 inch Copper Pipe',           'Floor 3',  80.00, 'ft'),
    ('1/2 inch Ball Valve',          'Floor 3',  12.00, 'pcs'),

    -- ---- Floor 4: heaviest — full rough plus fittings -------------------
    ('1/2 inch Copper Pipe',         'Floor 4', 200.00, 'ft'),
    ('3/4 inch Copper Pipe',         'Floor 4', 100.00, 'ft'),
    ('1/2 inch Pipe Clamp',          'Floor 4',   5.00, 'box'),
    ('Pipe Flux 8oz',                'Floor 4',   4.00, 'jar'),
    ('Teflon Tape Roll',             'Floor 4',   8.00, 'roll'),

    -- ---- Floor 5: in-progress mid-rise ----------------------------------
    ('3 inch PVC Pipe',              'Floor 5',  14.00, 'pcs'),
    ('3/4 inch SharkBite Coupling',  'Floor 5',  32.00, 'pcs'),

    -- ---- Floor 6: just one valve set ------------------------------------
    ('3/4 inch Gate Valve',          'Floor 6',   8.00, 'pcs'),

    -- ---- Floor 7: getting started ---------------------------------------
    ('1 1/2 inch PVC Pipe',          'Floor 7',  18.00, 'pcs'),
    ('2 inch PVC Pipe',              'Floor 7',  12.00, 'pcs'),
    ('3/4 inch SharkBite Coupling',  'Floor 7',  24.00, 'pcs'),

    -- ---- Connex Box: bulk stockpile -------------------------------------
    ('1/2 inch Copper Pipe',         'Connex Box', 800.00, 'ft'),
    ('3/4 inch Copper Pipe',         'Connex Box', 400.00, 'ft'),
    ('1 inch Copper Pipe',           'Connex Box', 200.00, 'ft'),
    ('1 1/2 inch Copper Pipe',       'Connex Box', 120.00, 'ft'),
    ('2 inch PVC Pipe',              'Connex Box',  60.00, 'pcs'),
    ('3 inch PVC Pipe',              'Connex Box',  40.00, 'pcs'),
    ('1/2 inch Ball Valve',          'Connex Box',  60.00, 'pcs'),
    ('Solder Roll (lead-free)',      'Connex Box',  24.00, 'roll'),
    ('Pipe Flux 8oz',                'Connex Box',  36.00, 'jar'),
    ('Plumbers Putty 14oz',          'Connex Box',  18.00, 'jar')
)
insert into public.inventory_items (material_id, location_id, quantity, unit, supplier_id)
select
  m.id,
  l.id,
  d.quantity,
  d.unit,
  m.supplier_id
from inv_data d
join public.materials m on m.name = d.material_name
join public.locations l on l.name = d.location_name
where not exists (
  select 1
  from public.inventory_items i
  where i.material_id = m.id and i.location_id = l.id
);


-- ============================================================================
-- Verify (run these manually if you want to confirm state)
-- ============================================================================
-- select count(*) as active_floors from public.locations where is_active and type='floor';
-- select count(*) as suppliers     from public.suppliers;
-- select count(*) as materials     from public.materials;
-- select count(*) as inventory     from public.inventory_items;
--
-- select l.name, count(i.id) as lines, coalesce(sum(i.quantity), 0) as units
-- from public.locations l
-- left join public.inventory_items i on i.location_id = l.id
-- where l.is_active
-- group by l.name, l.sort_order
-- order by l.sort_order;
