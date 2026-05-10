-- Activate all 21 floors of the North Tower. Idempotent:
--   * If a floor with that sort_order already exists, set is_active = true.
--   * Otherwise insert a fresh floor row.
-- Pairs with 06_set_active_floors_15.sql (which previously deactivated 16-21);
-- this file supersedes that.

do $$
declare
  i int;
begin
  for i in 1..21 loop
    update public.locations
       set is_active = true,
           updated_at = now()
     where type = 'floor'
       and sort_order = i;

    if not found then
      insert into public.locations (name, type, sort_order, is_active)
      values ('Floor ' || i, 'floor', i, true);
    end if;
  end loop;
end $$;

-- Sanity check (safe to ignore if you've renamed any floors).
select sort_order, name, is_active
  from public.locations
 where type = 'floor'
 order by sort_order;
