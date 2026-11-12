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
