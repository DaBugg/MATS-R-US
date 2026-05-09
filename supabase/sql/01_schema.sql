-- SNL Inventory MVP — Schema
-- Run order: 01_schema -> 02_triggers -> 03_realtime -> 04_rls -> 05_seed

create extension if not exists pgcrypto;

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('floor', 'storage', 'other')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists locations_active_sort_idx
  on public.locations (is_active, sort_order);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_unit text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists materials_active_name_idx
  on public.materials (is_active, name);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  quantity numeric(12, 2) not null default 0 check (quantity >= 0),
  unit text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_location_idx
  on public.inventory_items (location_id);

create index if not exists inventory_items_material_idx
  on public.inventory_items (material_id);
