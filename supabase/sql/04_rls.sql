-- MVP Row Level Security
-- WARNING: These policies grant full public CRUD access via the anon key.
-- This is acceptable for a private/test MVP only. Tighten before production.

alter table public.locations       enable row level security;
alter table public.suppliers       enable row level security;
alter table public.materials       enable row level security;
alter table public.inventory_items enable row level security;

drop policy if exists "Allow public read locations"   on public.locations;
drop policy if exists "Allow public insert locations" on public.locations;
drop policy if exists "Allow public update locations" on public.locations;
drop policy if exists "Allow public delete locations" on public.locations;

create policy "Allow public read locations"   on public.locations for select using (true);
create policy "Allow public insert locations" on public.locations for insert with check (true);
create policy "Allow public update locations" on public.locations for update using (true) with check (true);
create policy "Allow public delete locations" on public.locations for delete using (true);

drop policy if exists "Allow public read suppliers"   on public.suppliers;
drop policy if exists "Allow public insert suppliers" on public.suppliers;
drop policy if exists "Allow public update suppliers" on public.suppliers;
drop policy if exists "Allow public delete suppliers" on public.suppliers;

create policy "Allow public read suppliers"   on public.suppliers for select using (true);
create policy "Allow public insert suppliers" on public.suppliers for insert with check (true);
create policy "Allow public update suppliers" on public.suppliers for update using (true) with check (true);
create policy "Allow public delete suppliers" on public.suppliers for delete using (true);

drop policy if exists "Allow public read materials"   on public.materials;
drop policy if exists "Allow public insert materials" on public.materials;
drop policy if exists "Allow public update materials" on public.materials;
drop policy if exists "Allow public delete materials" on public.materials;

create policy "Allow public read materials"   on public.materials for select using (true);
create policy "Allow public insert materials" on public.materials for insert with check (true);
create policy "Allow public update materials" on public.materials for update using (true) with check (true);
create policy "Allow public delete materials" on public.materials for delete using (true);

drop policy if exists "Allow public read inventory_items"   on public.inventory_items;
drop policy if exists "Allow public insert inventory_items" on public.inventory_items;
drop policy if exists "Allow public update inventory_items" on public.inventory_items;
drop policy if exists "Allow public delete inventory_items" on public.inventory_items;

create policy "Allow public read inventory_items"   on public.inventory_items for select using (true);
create policy "Allow public insert inventory_items" on public.inventory_items for insert with check (true);
create policy "Allow public update inventory_items" on public.inventory_items for update using (true) with check (true);
create policy "Allow public delete inventory_items" on public.inventory_items for delete using (true);
