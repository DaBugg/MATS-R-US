-- Run on the existing Neon database after 10_shared_inventory.sql.
-- This first release is scoped to the existing PBAU job.
create table if not exists public.drawings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 180),
  blob_path text not null unique,
  page_count integer not null check (page_count between 1 and 200),
  created_at timestamptz not null default now()
);

create table if not exists public.drawing_pages (
  drawing_id uuid not null references public.drawings(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  extracted_text text not null default '',
  extraction_method text not null check (extraction_method in ('pdf-text', 'ocr', 'none')),
  updated_at timestamptz not null default now(),
  primary key (drawing_id, page_number)
);

create table if not exists public.takeoffs (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid not null unique references public.drawings(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.takeoff_items (
  id uuid primary key default gen_random_uuid(),
  takeoff_id uuid not null references public.takeoffs(id) on delete cascade,
  material_id uuid references public.materials(id),
  description text not null check (length(description) between 1 and 180),
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null check (length(unit) between 1 and 40),
  page_number integer not null check (page_number > 0),
  x numeric(6,5) check (x between 0 and 1),
  y numeric(6,5) check (y between 0 and 1),
  evidence text not null default '' check (length(evidence) <= 500),
  status text not null default 'review' check (status in ('review', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists takeoff_items_takeoff_idx on public.takeoff_items(takeoff_id);
create index if not exists takeoff_items_material_idx on public.takeoff_items(material_id);
