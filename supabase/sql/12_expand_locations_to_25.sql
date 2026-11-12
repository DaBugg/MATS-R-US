-- Keep the site catalog in sync with the 25-floor North Tower layout.
-- Run after 11_activate_pbau.sql on a newly provisioned database.
-- Safe to re-run; existing stock rows and location IDs are preserved.

do $$
declare
  floor_number integer;
begin
  for floor_number in 1..25 loop
    update public.locations
       set type = 'floor',
           sort_order = floor_number,
           is_active = true,
           updated_at = now()
     where name = 'Floor ' || floor_number;

    if not found then
      insert into public.locations (name, type, sort_order, is_active)
      values ('Floor ' || floor_number, 'floor', floor_number, true);
    end if;
  end loop;
end $$;

update public.locations
   set type = 'floor', sort_order = 26, is_active = true, updated_at = now()
 where name = 'Deck';

insert into public.locations (name, type, sort_order, is_active)
select 'Garage', 'storage', 101, true
where not exists (select 1 from public.locations where name = 'Garage');

update public.locations
   set type = 'storage', sort_order = 101, is_active = true, updated_at = now()
 where name = 'Garage';
