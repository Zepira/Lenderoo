-- Single-row config table so return-reminders' interval and copy can be
-- tuned from the DB (SQL editor / table editor) without redeploying the
-- edge function. The {{item}} token in title/body gets replaced with the
-- borrowed item's name at send time.
create table if not exists public.notification_settings (
  id boolean primary key default true,
  reminder_interval_days integer not null default 7,
  reminder_title text not null default 'Still got this?',
  reminder_body text not null default 'You borrowed "{{item}}" a week ago. Time to return it?',
  updated_at timestamptz not null default now(),
  constraint notification_settings_singleton check (id)
);

insert into public.notification_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.notification_settings enable row level security;

-- Read-only for authenticated users (edge function uses the service role
-- key, which bypasses RLS); no one else needs access to this table.
create policy "Authenticated users can read notification settings"
  on public.notification_settings for select
  to authenticated
  using (true);
