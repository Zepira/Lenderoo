-- Shared cache of barcode -> product lookups, so repeat scans of the same
-- item (by any user) never re-hit UPCitemdb's free-tier rate limit.
create table if not exists public.barcode_lookups (
  barcode text primary key,
  title text,
  brand text,
  category text,
  description text,
  images jsonb,
  raw_response jsonb,
  source text not null default 'upcitemdb',
  created_at timestamptz not null default now()
);

alter table public.barcode_lookups enable row level security;

create policy "Authenticated users can read barcode lookups"
  on public.barcode_lookups for select
  to authenticated
  using (true);

create policy "Authenticated users can cache barcode lookups"
  on public.barcode_lookups for insert
  to authenticated
  with check (true);
