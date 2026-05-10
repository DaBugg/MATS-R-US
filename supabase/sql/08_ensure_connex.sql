-- ============================================================================
-- 08_ensure_connex.sql
--
-- Belt-and-suspenders: guarantee the Connex Box storage location exists
-- and is active. Run any time. Fully idempotent — safe to re-run.
--
-- Why this file exists: locations.name has no unique constraint in the MVP
-- schema, so the original seed's `on conflict do nothing` could silently fail
-- if the table were ever in an unexpected state. This file uses an explicit
-- `where not exists` guard so it's bulletproof.
-- ============================================================================

-- 1. Create the Connex Box if no storage location named "Connex Box" exists.
insert into public.locations (name, type, sort_order, is_active)
select 'Connex Box', 'storage', 100, true
where not exists (
  select 1
  from public.locations
  where type = 'storage'
    and lower(name) = 'connex box'
);

-- 2. If the Connex Box exists but is archived, reactivate it.
update public.locations
set is_active = true
where type = 'storage'
  and lower(name) = 'connex box'
  and is_active = false;


-- ============================================================================
-- Verify — should return one row with type='storage', is_active=true.
-- Run this after the inserts to confirm.
-- ============================================================================
-- select id, name, type, sort_order, is_active
-- from public.locations
-- where type = 'storage';
--
-- And the connex inventory summary:
-- select m.name, i.quantity, i.unit
-- from public.inventory_items i
-- join public.materials m on m.id = i.material_id
-- join public.locations l on l.id = i.location_id
-- where l.type = 'storage' and lower(l.name) = 'connex box'
-- order by m.name;
