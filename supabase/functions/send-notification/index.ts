import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

interface SendNotificationRequest {
  title: string;
  body: string;
  userIds?: string[];
  data?: Record<string, unknown>;
}

// Ad-hoc push sender for testing. Invoke with:
//   curl -X POST https://<project>.supabase.co/functions/v1/send-notification \
//     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
//     -d '{"title": "Hey", "body": "Test push", "userIds": ["<uuid>"]}'
// Omit userIds to broadcast to every user with a registered push token.
Deno.serve(async (req) => {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: SendNotificationRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  if (!payload.title || !payload.body) {
    return new Response('title and body are required', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Everyone (or the given users), on every device they're signed in on (migration 053).
  let ids = payload.userIds ?? [];
  if (ids.length === 0) {
    const { data: all, error: allErr } = await supabase.from('users').select('id').is('deleted_at', null);
    if (allErr) return new Response(`query error: ${allErr.message}`, { status: 500 });
    ids = (all ?? []).map((u) => u.id as string);
  }
  const { data: rows, error } = await supabase.rpc('push_tokens_for', { p_users: ids });
  if (error) {
    return new Response(`query error: ${error.message}`, { status: 500 });
  }
  const tokens = [...new Set(((rows ?? []) as { token: string }[]).map((r) => r.token).filter(Boolean))];
  if (tokens.length === 0) {
    return new Response('no matching users with a push token', { status: 200 });
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
    }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(`Expo push error: ${text}`, { status: 502 });
  }

  return new Response(`sent ${messages.length} notifications`, { status: 200 });
});
