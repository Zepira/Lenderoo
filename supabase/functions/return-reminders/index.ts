import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const REMINDER_INTERVAL_DAYS = 7;

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

interface OverdueItem {
  id: string;
  name: string;
  borrowed_by: string;
  borrowed_date: string;
  users: { push_token: string | null } | null;
}

// Scheduled weekly via a Supabase Cron Job (Dashboard > Edge Functions > Schedules),
// which invokes this function with the CRON_SECRET as a bearer token.
Deno.serve(async (req) => {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const cutoff = new Date(Date.now() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, borrowed_by, borrowed_date, users:borrowed_by(push_token)')
    .not('borrowed_by', 'is', null)
    .is('returned_date', null)
    .lte('borrowed_date', cutoff)
    .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lte.${cutoff}`)
    .returns<OverdueItem[]>();

  if (error) {
    return new Response(`query error: ${error.message}`, { status: 500 });
  }
  if (!items || items.length === 0) {
    return new Response('no reminders due', { status: 200 });
  }

  const messages: ExpoPushMessage[] = [];
  const remindedItemIds: string[] = [];

  for (const item of items) {
    const token = item.users?.push_token;
    if (!token) continue;
    messages.push({
      to: token,
      title: 'Still got this?',
      body: `You borrowed "${item.name}" a week ago. Time to return it?`,
      data: { type: 'return_reminder', itemId: item.id },
      sound: 'default',
    });
    remindedItemIds.push(item.id);
  }

  if (messages.length === 0) {
    return new Response('no reminders due', { status: 200 });
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
    .update({ last_reminder_sent_at: new Date().toISOString() })
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

  return new Response(`sent ${messages.length} reminders`, { status: 200 });
});
