-- App-wide settings the app reads at runtime, changeable without a release.
-- First use: the ads kill switch (docs/ADS-PLAN.md §2.6). Flip
-- ads.enabled in the dashboard to turn the banner on or off for everyone.

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Anyone may read (the app checks it before sign-in too). No insert, update
-- or delete policies: only the dashboard / service role can change it.
drop policy if exists "app_config readable by everyone" on public.app_config;
create policy "app_config readable by everyone"
  on public.app_config for select
  to anon, authenticated
  using (true);

-- Ads start off; turn on once AdMob is set up.
insert into public.app_config (key, value)
values ('ads', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;
