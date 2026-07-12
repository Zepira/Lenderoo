-- Fires the push-notifications edge function on borrow_requests / friend_connections
-- inserts and updates. Mirrors the WebhookPayload shape the function expects
-- (type/table/schema/record/old_record). The bearer secret is pulled from
-- Vault at call time so it never lands in this file or git history.
-- Before this runs, store it (must match the WEBHOOK_SECRET edge fn secret):
--   select vault.create_secret('<same value as WEBHOOK_SECRET>', 'push_notifications_webhook_secret');
create extension if not exists pg_net;

create or replace function public.notify_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', case tg_op when 'INSERT' then 'INSERT' when 'UPDATE' then 'UPDATE' else 'DELETE' end,
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record', case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    'old_record', case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end
  );

  perform net.http_post(
    url := 'https://ymboxvasluhlwgofrpya.supabase.co/functions/v1/push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'push_notifications_webhook_secret'
      )
    ),
    body := payload
  );

  return null;
end;
$$;

drop trigger if exists borrow_requests_notify_push on public.borrow_requests;
create trigger borrow_requests_notify_push
  after insert or update on public.borrow_requests
  for each row execute function public.notify_push_webhook();

drop trigger if exists friend_connections_notify_push on public.friend_connections;
create trigger friend_connections_notify_push
  after insert or update on public.friend_connections
  for each row execute function public.notify_push_webhook();
