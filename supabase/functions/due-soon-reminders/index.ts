import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

interface DueSoonItem {
  id: string;
  name: string;
  borrowed_by: string;
  due_date: string;
  users: { push_token: string | null } | null;
}

// Scheduled daily via pg_cron (see supabase/migrations/046_max_borrow_duration.sql),
// which invokes this function with the CRON_SECRET as a bearer token. Fires
// once per loan, a fixed number of days before due_date — see
// docs/NOTIFICATIONS.md for the full picture of when this and the other
// notification triggers fire.
Deno.serve(async (req) => {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('due_soon_reminder_days_before, due_soon_reminder_title, due_soon_reminder_body')
    .eq('id', true)
    .single();

  const daysBefore = settings?.due_soon_reminder_days_before ?? 7;
  const titleTemplate = settings?.due_soon_reminder_title ?? 'Due soon';
  const bodyTemplate =
    settings?.due_soon_reminder_body ?? '"{{item}}" is due back in {{days}} days.';

  const now = new Date();
  const windowEnd = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000).toISOString();

  // Still borrowed, has a real due date, not overdue yet, due date falls
  // inside the lead-time window, and hasn't already been reminded this loan.
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, borrowed_by, due_date, users:borrowed_by(push_token)')
    .not('borrowed_by', 'is', null)
    .not('due_date', 'is', null)
    .is('returned_date', null)
    .is('due_soon_reminded_at', null)
    .gt('due_date', now.toISOString())
    .lte('due_date', windowEnd)
    .returns<DueSoonItem[]>();

  if (error) {
    return new Response(`query error: ${error.message}`, { status: 500 });
  }
  if (!items || items.length === 0) {
    return new Response('no due-soon reminders due', { status: 200 });
  }

  const messages: ExpoPushMessage[] = [];
  const remindedItemIds: string[] = [];

  for (const item of items) {
    const token = item.users?.push_token;
    if (!token) continue;
    const daysRemaining = Math.max(
      1,
      Math.ceil((new Date(item.due_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );
    messages.push({
      to: token,
      title: titleTemplate.replaceAll('{{item}}', item.name),
      body: bodyTemplate
        .replaceAll('{{item}}', item.name)
        .replaceAll('{{days}}', String(daysRemaining)),
      data: { type: 'item_due_soon', itemId: item.id },
      sound: 'default',
    });
    remindedItemIds.push(item.id);
  }

  if (messages.length === 0) {
    return new Response('no due-soon reminders due', { status: 200 });
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(`Expo push error: ${text}`, { status: 502 });
  }

  await supabase
    .from('items')
    .update({ due_soon_reminded_at: new Date().toISOString() })
    .in('id', remindedItemIds);

  // Clear tokens Expo reports as no longer registered.
  const result = await res.json();
  const tickets = Array.isArray(result.data) ? result.data : [result.data];
  const deadTokens = tickets
    .map((t: any, i: number) => (t?.details?.error === 'DeviceNotRegistered' ? messages[i].to : null))
    .filter(Boolean);
  if (deadTokens.length > 0) {
    await supabase.from('users').update({ push_token: null }).in('push_token', deadTokens);
  }

  return new Response(`sent ${messages.length} due-soon reminders`, { status: 200 });
});
