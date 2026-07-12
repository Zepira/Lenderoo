-- Schedule the weekly return-reminders edge function via pg_cron + pg_net.
-- The bearer token is pulled from Supabase Vault at call time, so no secret
-- value ever lands in this file or git history. Before this runs, store it:
--   select vault.create_secret('<same value as CRON_SECRET edge fn secret>', 'return_reminders_cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'return-reminders-weekly',
  '0 9 * * 1',
  $$
  select net.http_post(
    url := 'https://ymboxvasluhlwgofrpya.supabase.co/functions/v1/return-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'return_reminders_cron_secret'
      ),
      'Content-Type', 'application/json'
    )
  );
  $$
);
