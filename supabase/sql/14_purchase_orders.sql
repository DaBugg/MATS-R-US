-- PO records are separate from inventory. Receipts never mutate stock.
create table if not exists public.purchase_orders (
 id uuid primary key,
 number text not null unique check (length(number) between 1 and 80),
 supplier text not null check (length(supplier) between 1 and 180),
 expected_date date,
 status text not null default 'draft' check (status in ('draft','ordered','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.purchase_order_lines (
 id uuid primary key default gen_random_uuid(),
 purchase_order_id uuid not null references public.purchase_orders(id),
 material_id uuid not null references public.materials(id),
 unit text not null check (length(unit) between 1 and 40),
 quantity numeric(12,2) not null check (quantity > 0),
 unique(purchase_order_id, material_id, unit)
);
create table if not exists public.purchase_order_receipts (
 id uuid primary key,
 line_id uuid not null references public.purchase_order_lines(id),
 quantity numeric(12,2) not null check (quantity > 0),
 created_at timestamptz not null default now()
);
create index if not exists po_receipts_line_idx on public.purchase_order_receipts(line_id);

-- Serialize receipts and status changes on the parent PO. Retried receipt IDs
-- return the original result; they cannot log a delivery twice.
create or replace function public.record_po_receipt(p_id uuid, p_line uuid, p_quantity numeric)
returns uuid language plpgsql as $$
declare v_order uuid; v_status text; v_quantity numeric; v_received numeric; v_existing public.purchase_order_receipts;
begin
 select purchase_order_id, quantity into v_order,v_quantity from public.purchase_order_lines where id=p_line;
 if not found then raise exception 'PO line not found'; end if;
 select status into v_status from public.purchase_orders where id=v_order for update;
 select * into v_existing from public.purchase_order_receipts where id=p_id;
 if found then
  if v_existing.line_id<>p_line or v_existing.quantity<>p_quantity then raise exception 'Receipt ID already used for different details'; end if;
  return p_id;
 end if;
 if v_status<>'ordered' then raise exception 'Only ordered POs can log deliveries'; end if;
 select coalesce(sum(quantity),0) into v_received from public.purchase_order_receipts where line_id=p_line;
 if p_quantity is null or p_quantity<=0 or p_quantity<>round(p_quantity,2) or v_received+p_quantity>v_quantity then raise exception 'Delivery exceeds the remaining quantity'; end if;
 insert into public.purchase_order_receipts(id,line_id,quantity) values(p_id,p_line,p_quantity);
 update public.purchase_orders set updated_at=now() where id=v_order;
 return p_id;
end $$;

create or replace function public.set_po_status(p_id uuid,p_status text)
returns uuid language plpgsql as $$
declare v_status text;
begin
 select status into v_status from public.purchase_orders where id=p_id for update;
 if not found then raise exception 'PO not found'; end if;
 if p_status not in ('ordered','cancelled') or p_status is null then raise exception 'Invalid status'; end if;
 if v_status=p_status then return p_id; end if;
 if v_status='cancelled' or (v_status='ordered' and p_status<>'cancelled') then raise exception 'Invalid PO transition'; end if;
 if p_status='cancelled' and exists(select 1 from public.purchase_order_receipts r join public.purchase_order_lines l on l.id=r.line_id where l.purchase_order_id=p_id) then raise exception 'POs with deliveries cannot be cancelled'; end if;
 update public.purchase_orders set status=p_status,updated_at=now() where id=p_id;
 return p_id;
end $$;
