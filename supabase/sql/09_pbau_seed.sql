-- =========================================================================
-- 09_pbau_seed.sql
--
-- Generated from /Users/dw/Downloads/plumbing_inventory.xlsx by
-- scripts/build_pbau_seed.py — re-run that script to regenerate.
--
-- Idempotent. Safe to re-run.
-- =========================================================================

-- 1. Ensure non-floor locations exist (PBAU, Deck, Floor 12 ★).
--    Idempotent — only inserts if a row with that name doesn't exist.
insert into public.locations (name, type, sort_order, is_active)
select v.name, v.type, v.sort_order, true
from (values
    ('Deck',       'floor',  22,  'roof / top working deck'),
    ('Floor 12 ★', 'other',  125, 'tech cart on floor 12'),
    ('PBAU',       'other',  200, 'project base / staging area')
) as v(name, type, sort_order, note)
where not exists (
    select 1 from public.locations l where l.name = v.name
);

-- Activate every floor that appears in the spreadsheet (the building map
-- renders only active floors). Floors NOT in the spreadsheet are deactivated
-- so the visualization matches the dataset exactly.
update public.locations
set is_active = true
where type = 'floor' and name in ('Floor 3', 'Floor 4', 'Floor 5', 'Floor 6', 'Floor 7', 'Floor 8', 'Floor 9', 'Floor 10', 'Floor 11', 'Floor 12', 'Floor 13', 'Floor 14', 'Floor 15', 'Floor 16', 'Floor 17', 'Floor 18');

update public.locations
set is_active = false
where type = 'floor' and name not in ('Floor 3', 'Floor 4', 'Floor 5', 'Floor 6', 'Floor 7', 'Floor 8', 'Floor 9', 'Floor 10', 'Floor 11', 'Floor 12', 'Floor 13', 'Floor 14', 'Floor 15', 'Floor 16', 'Floor 17', 'Floor 18');

-- 2. Suppliers from the spreadsheet (idempotent on unique name).
insert into public.suppliers (name, is_active) values
    ('Charlotte', true),
    ('Hold-Rite', true),
    ('Sioux Chief', true)
on conflict (name) do nothing;

-- 3. Master materials list, derived from (Size, Material, Part). Idempotent.
with material_data(name, default_unit, supplier_name) as (values
    ('1 1/2 in. Metal Copper pipe', 'pcs', null),
    ('1 1/2 in. PVC Pipe', 'pcs', 'Charlotte'),
    ('1 1/2 in. PVC Waste arm prefab', 'pcs', 'Charlotte'),
    ('1 in. Metal Copper pipe', 'pcs', null),
    ('1 in. Metal Copper riser clamp', 'pcs', null),
    ('1 in. PVC Coupling', 'pcs', 'Charlotte'),
    ('1/2 in. Metal Copper riser clamp', 'pcs', null),
    ('1/2 in. Metal Stub out elbows', 'pcs', 'Sioux Chief'),
    ('1/2 in. PVC 90s', 'pcs', 'Charlotte'),
    ('2 in. Metal Copper pipe', 'pcs', null),
    ('2 in. PVC 45s', 'pcs', 'Charlotte'),
    ('2 in. PVC 90s', 'pcs', 'Charlotte'),
    ('2 in. PVC Clean out plug', 'pcs', 'Charlotte'),
    ('2 in. PVC Clean out tee', 'pcs', 'Charlotte'),
    ('2 in. PVC P-trap', 'pcs', 'Charlotte'),
    ('2 in. PVC Sanitary', 'pcs', 'Charlotte'),
    ('3 in. PVC pipe', 'pcs', 'Charlotte'),
    ('3 in. x 10 ft. PVC Pipe', 'pcs', 'Charlotte'),
    ('4 in. Metal Hangers', 'pcs', 'Charlotte'),
    ('4 in. Metal Riser clamps', 'pcs', 'Charlotte'),
    ('4 in. PVC 45s', 'pcs', 'Charlotte'),
    ('4 in. PVC 90s', 'pcs', 'Charlotte'),
    ('4 in. PVC Clean out plug', 'pcs', 'Charlotte'),
    ('4 in. PVC Clean out tee', 'pcs', 'Charlotte'),
    ('4 in. PVC Coupling', 'pcs', 'Charlotte'),
    ('4 in. PVC Couplings', 'pcs', 'Charlotte'),
    ('4 in. PVC Y fitting', 'pcs', 'Charlotte'),
    ('4 in. PVC pipe', 'pcs', 'Charlotte'),
    ('5 in. PVC pipe', 'pcs', 'Charlotte'),
    ('6 in. PVC Clean out plug', 'pcs', 'Charlotte'),
    ('6 in. PVC Clean out tee', 'pcs', 'Charlotte'),
    ('6 in. PVC Sanitary', 'pcs', 'Charlotte'),
    ('6 in. PVC pipe', 'pcs', 'Charlotte'),
    ('6 in. x 5 ft. PVC Pipe', 'pcs', 'Charlotte'),
    ('7 3/4 in. Telescoping', 'pcs', 'Hold-Rite'),
    ('Big Joe cart', 'pcs', null),
    ('Blue + red wires', 'pcs', null),
    ('Blue buckets', 'pcs', null),
    ('Cart', 'pcs', null),
    ('PVC Prefab', 'pcs', null),
    ('PVC Prefab P-trap', 'pcs', null),
    ('Prefab bags', 'pcs', null),
    ('Red wires', 'pcs', null),
    ('Unknown item', 'pcs', null),
    ('Yellow box clean seal', 'pcs', null),
    ('Yellow sleeve', 'pcs', null)
)
insert into public.materials (name, default_unit, supplier_id)
select md.name, md.default_unit, s.id
from material_data md
left join public.suppliers s on s.name = md.supplier_name
where not exists (
    select 1 from public.materials m where m.name = md.name
);

-- 4. Inventory rows from the spreadsheet (idempotent: only inserts if a
--    (material, location) pair doesn't already exist).
with inv_data(material_name, location_name, quantity, unit, supplier_name, notes) as (values
    ('4 in. PVC 45s', 'Deck', 50.00, 'pcs', 'Charlotte', null),
    ('4 in. PVC Couplings', 'Deck', 100.00, 'pcs', 'Charlotte', null),
    ('2 in. PVC Clean out plug', 'Deck', 50.00, 'pcs', 'Charlotte', null),
    ('2 in. PVC Clean out tee', 'Deck', 60.00, 'pcs', 'Charlotte', null),
    ('4 in. PVC Clean out tee', 'Deck', 20.00, 'pcs', 'Charlotte', null),
    ('4 in. PVC 45s', 'Deck', 50.00, 'pcs', 'Charlotte', null),
    ('2 in. PVC 45s', 'Deck', 50.00, 'pcs', 'Charlotte', null),
    ('4 in. PVC Clean out plug', 'Deck', 20.00, 'pcs', 'Charlotte', null),
    ('1/2 in. Metal Stub out elbows', 'Deck', 200.00, 'pcs', 'Sioux Chief', null),
    ('2 in. Metal Copper pipe', 'Floor 18', 5.00, 'pcs', null, null),
    ('1/2 in. Metal Copper riser clamp', 'Floor 18', 20.00, 'pcs', null, null),
    ('1 in. Metal Copper riser clamp', 'Floor 18', 12.00, 'pcs', null, null),
    ('Yellow sleeve', 'Floor 18', 150.00, 'pcs', null, null),
    ('Prefab bags', 'Floor 17', 3.00, 'pcs', null, null),
    ('Yellow sleeve', 'Floor 17', 20.00, 'pcs', null, null),
    ('2 in. PVC P-trap', 'Floor 16', 80.00, 'pcs', 'Charlotte', null),
    ('2 in. PVC Sanitary', 'Floor 16', 210.00, 'pcs', 'Charlotte', null),
    ('2 in. PVC 90s', 'Floor 16', 50.00, 'pcs', 'Charlotte', null),
    ('6 in. PVC Clean out tee', 'Floor 16', 9.00, 'pcs', 'Charlotte', null),
    ('6 in. PVC Sanitary', 'Floor 16', 17.00, 'pcs', 'Charlotte', null),
    ('4 in. PVC Clean out plug', 'Floor 16', 20.00, 'pcs', 'Charlotte', null),
    ('4 in. PVC Y fitting', 'Floor 16', 5.00, 'pcs', 'Charlotte', null),
    ('3 in. x 10 ft. PVC Pipe', 'Floor 16', 4.00, 'pcs', 'Charlotte', null),
    ('6 in. x 5 ft. PVC Pipe', 'Floor 16', 5.00, 'pcs', 'Charlotte', null),
    ('2 in. Metal Copper pipe', 'Floor 15', 24.00, 'pcs', null, null),
    ('1 1/2 in. Metal Copper pipe', 'Floor 15', 8.00, 'pcs', null, null),
    ('6 in. PVC pipe', 'Floor 15', 8.00, 'pcs', 'Charlotte', null),
    ('7 3/4 in. Telescoping', 'Floor 15', 15.00, 'pcs', 'Hold-Rite', null),
    ('Unknown item', 'Floor 15', 0.00, 'pcs', null, '[qty TBD] ID needed'),
    ('PVC Prefab P-trap', 'Floor 15', 11.00, 'pcs', null, null),
    ('5 in. PVC pipe', 'Floor 15', 0.00, 'pcs', 'Charlotte', '[qty TBD]'),
    ('4 in. PVC pipe', 'Floor 15', 0.00, 'pcs', 'Charlotte', '[qty TBD]'),
    ('4 in. Metal Riser clamps', 'Floor 15', 8.00, 'pcs', 'Charlotte', null),
    ('3 in. PVC pipe', 'Floor 15', 6.00, 'pcs', 'Charlotte', null),
    ('6 in. PVC Clean out plug', 'Floor 15', 10.00, 'pcs', 'Charlotte', null),
    ('4 in. PVC Coupling', 'Floor 15', 13.00, 'pcs', 'Charlotte', null),
    ('1 1/2 in. PVC Waste arm prefab', 'Floor 15', 0.00, 'pcs', 'Charlotte', '[qty TBD]'),
    ('Blue buckets', 'Floor 15', 2.00, 'pcs', null, null),
    ('4 in. Metal Hangers', 'Floor 14', 10.00, 'pcs', 'Charlotte', 'Trash to collect on floor'),
    ('6 in. PVC Sanitary', 'Floor 14', 2.00, 'pcs', 'Charlotte', null),
    ('1 in. PVC Coupling', 'Floor 12 ★', 0.00, 'pcs', 'Charlotte', '[qty TBD] Trash + material / Tech cart (Louie)'),
    ('6 in. PVC Sanitary', 'Floor 12 ★', 0.00, 'pcs', 'Charlotte', '[qty TBD]'),
    ('1 1/2 in. PVC Pipe', 'Floor 12', 5.00, 'pcs', 'Charlotte', null),
    ('PVC Prefab', 'Floor 12', 0.00, 'pcs', null, '[qty TBD]'),
    ('Blue + red wires', 'Floor 12', 0.00, 'pcs', null, '[qty TBD]'),
    ('4 in. PVC 90s', 'Floor 12', 0.00, 'pcs', 'Charlotte', '[qty TBD]'),
    ('Big Joe cart', 'Floor 9', 1.00, 'pcs', null, null),
    ('Cart', 'Floor 9', 1.00, 'pcs', null, null),
    ('2 in. Metal Copper pipe', 'Floor 8', 3.00, 'pcs', null, 'Lil Joe working/soldering'),
    ('1 in. Metal Copper pipe', 'Floor 8', 1.00, 'pcs', null, null),
    ('Red wires', 'Floor 8', 0.00, 'pcs', null, '[qty TBD]'),
    ('Yellow box clean seal', 'Floor 8', 0.00, 'pcs', null, '[qty TBD]'),
    ('2 in. Metal Copper pipe', 'Floor 7', 0.00, 'pcs', null, '[qty TBD] Trash pipe on floor'),
    ('1 in. Metal Copper pipe', 'Floor 7', 0.00, 'pcs', null, '[qty TBD]'),
    ('1/2 in. PVC 90s', 'Floor 7', 50.00, 'pcs', 'Charlotte', null)
)
insert into public.inventory_items
    (material_id, location_id, quantity, unit, supplier_id, notes)
select
    m.id,
    l.id,
    d.quantity,
    d.unit,
    s.id,
    d.notes
from inv_data d
join public.materials  m on m.name = d.material_name
join public.locations  l on l.name = d.location_name
left join public.suppliers s on s.name = d.supplier_name
where not exists (
    select 1 from public.inventory_items i
    where i.material_id = m.id and i.location_id = l.id
);

-- =========================================================================
-- Verify (uncomment to inspect):
-- select l.name, count(i.id) as lines, coalesce(sum(i.quantity), 0) as units
-- from public.locations l
-- left join public.inventory_items i on i.location_id = l.id
-- where l.is_active
-- group by l.name, l.sort_order
-- order by l.sort_order;
-- =========================================================================
