-- One-time activation of repository PBAU stock. Run in one transaction.
-- Existing demo records are retained in mats_archive before active rows change.
begin;
create schema if not exists mats_archive;
create table mats_archive.locations_20261112 as table public.locations;
create table mats_archive.suppliers_20261112 as table public.suppliers;
create table mats_archive.materials_20261112 as table public.materials;
create table mats_archive.inventory_items_20261112 as table public.inventory_items;
delete from public.inventory_items;
delete from public.materials;
delete from public.suppliers;
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
    sum(d.quantity),
    max(d.unit),
    min(s.id::text)::uuid,
    string_agg(distinct d.notes, E'\n') filter (where d.notes is not null)
from inv_data d
join public.materials  m on m.name = d.material_name
join public.locations  l on l.name = d.location_name
left join public.suppliers s on s.name = d.supplier_name
where not exists (
    select 1 from public.inventory_items i
    where i.material_id = m.id and i.location_id = l.id
)
group by m.id, l.id;

-- =========================================================================
-- Verify (uncomment to inspect):
-- select l.name, count(i.id) as lines, coalesce(sum(i.quantity), 0) as units
-- from public.locations l
-- left join public.inventory_items i on i.location_id = l.id
-- where l.is_active
-- group by l.name, l.sort_order
-- order by l.sort_order;
-- =========================================================================

-- Run after the PBAU import. Database constraints protect all writers.
create unique index if not exists inventory_one_material_per_location
  on public.inventory_items (material_id, location_id);
create unique index if not exists materials_unique_normalized_name
  on public.materials ((lower(btrim(name))));
create unique index if not exists locations_unique_normalized_name
  on public.locations ((lower(btrim(name))));

create table if not exists public.inventory_events (
  request_id uuid primary key,
  actor text not null check (actor in ('site-editor', 'dot')),
  action text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public.apply_inventory_change(
  p_request_id uuid, p_action text, p_row_id uuid, p_target_location_id uuid,
  p_material_id uuid, p_location_id uuid, p_amount numeric, p_unit text,
  p_supplier_id uuid, p_notes text, p_actor text
) returns jsonb language plpgsql as $$
declare
  v_source public.inventory_items%rowtype;
  v_target public.inventory_items%rowtype;
  v_material_id uuid;
  v_result jsonb;
  v_note text;
begin
  if p_actor not in ('site-editor', 'dot') then
    raise exception 'Invalid actor';
  end if;
  if p_action not in ('create', 'add', 'subtract', 'move', 'set', 'delete') then
    raise exception 'Invalid stock action';
  end if;
  -- Repeated requests return the original result without applying stock twice.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select result into v_result from public.inventory_events where request_id = p_request_id;
  if found then return v_result; end if;

  if p_amount is not null and
     (p_amount < 0 or p_amount > 9999999999 or p_amount <> trunc(p_amount, 2)) then
    raise exception 'Quantity must be nonnegative with at most two decimals';
  end if;
  if p_action in ('add', 'subtract', 'move') and (p_amount is null or p_amount <= 0) then
    raise exception 'Quantity must be greater than zero';
  end if;
  if p_action in ('create', 'set') and p_amount is null then
    raise exception 'Quantity is required';
  end if;

  if p_action = 'create' then
    if p_material_id is null or p_location_id is null then
      raise exception 'Material and location are required';
    end if;
    v_material_id := p_material_id;
  else
    if p_row_id is null then raise exception 'Inventory row is required'; end if;
    select material_id into v_material_id from public.inventory_items where id = p_row_id;
    if not found then raise exception 'Inventory row was not found'; end if;
  end if;
  -- Serialize changes to the same material, including opposite-direction moves.
  perform pg_advisory_xact_lock(hashtextextended(v_material_id::text, 1));

  if p_action = 'create' then
    insert into public.inventory_items (material_id, location_id, quantity, unit, supplier_id, notes)
    values (p_material_id, p_location_id, p_amount, p_unit, p_supplier_id, nullif(btrim(p_notes), ''))
    returning * into v_source;
    v_result := jsonb_build_object('row', to_jsonb(v_source));
  else
    select * into v_source from public.inventory_items where id = p_row_id for update;
    if not found then raise exception 'Inventory row was not found'; end if;
    v_note := nullif(btrim(p_notes), '');
    if p_action = 'add' then
      update public.inventory_items
      set quantity = quantity + p_amount,
          notes = case when v_note is null then notes else concat_ws(E'\n', nullif(notes, ''), '+' || p_amount || ' ' || v_note) end,
          updated_at = now()
      where id = p_row_id returning * into v_source;
      v_result := jsonb_build_object('row', to_jsonb(v_source));
    elsif p_action = 'subtract' then
      if v_source.quantity < p_amount then raise exception 'Only % available', v_source.quantity; end if;
      update public.inventory_items
      set quantity = quantity - p_amount,
          notes = concat_ws(E'\n', nullif(notes, ''), '-' || p_amount || coalesce(' ' || v_note, '')),
          updated_at = now()
      where id = p_row_id returning * into v_source;
      v_result := jsonb_build_object('row', to_jsonb(v_source));
    elsif p_action = 'move' then
      if p_target_location_id is null or p_target_location_id = v_source.location_id then
        raise exception 'Choose a different destination';
      end if;
      if v_source.quantity < p_amount then raise exception 'Only % available at source', v_source.quantity; end if;
      update public.inventory_items
      set quantity = quantity - p_amount,
          notes = concat_ws(E'\n', nullif(notes, ''), '→ moved ' || p_amount || coalesce(' ' || v_note, '')),
          updated_at = now()
      where id = p_row_id returning * into v_source;
      insert into public.inventory_items (material_id, location_id, quantity, unit, supplier_id, notes)
      values (v_material_id, p_target_location_id, p_amount, v_source.unit, v_source.supplier_id,
              '← received ' || p_amount || coalesce(' ' || v_note, ''))
      on conflict (material_id, location_id) do update
      set quantity = public.inventory_items.quantity + excluded.quantity,
          notes = concat_ws(E'\n', nullif(public.inventory_items.notes, ''), excluded.notes),
          updated_at = now()
      returning * into v_target;
      v_result := jsonb_build_object('source', to_jsonb(v_source), 'target', to_jsonb(v_target));
    elsif p_action = 'set' then
      update public.inventory_items set quantity = p_amount,
        unit = coalesce(p_unit, unit), supplier_id = coalesce(p_supplier_id, supplier_id),
        notes = coalesce(p_notes, notes), updated_at = now()
      where id = p_row_id returning * into v_source;
      v_result := jsonb_build_object('row', to_jsonb(v_source));
    elsif p_action = 'delete' then
      delete from public.inventory_items where id = p_row_id returning * into v_source;
      v_result := jsonb_build_object('deleted', to_jsonb(v_source));
    end if;
  end if;

  insert into public.inventory_events (request_id, actor, action, result)
  values (p_request_id, p_actor, p_action, v_result);
  return v_result;
end;
$$;

-- The source has 55 lines; one repeated Deck/material pair is summed to one row.
do $$ begin
  if (select count(*) from public.inventory_items) <> 54 then
    raise exception 'PBAU import expected 54 unique inventory rows';
  end if;
  if (select count(*) from public.materials) <> 46 then
    raise exception 'PBAU import expected 46 materials';
  end if;
  if (select quantity from public.inventory_items i join public.materials m on m.id=i.material_id join public.locations l on l.id=i.location_id where m.name='4 in. PVC 45s' and l.name='Deck') <> 100 then
    raise exception 'Repeated Deck row was not summed to 100';
  end if;
end $$;
commit;
