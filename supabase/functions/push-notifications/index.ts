import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
}

Deno.serve(async (req) => {
  // Verify the request comes from Supabase (shared webhook secret)
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload: WebhookPayload = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const message = await buildMessage(supabase, payload);
  if (!message) {
    return new Response('no notification needed', { status: 200 });
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(`Expo push error: ${text}`, { status: 502 });
  }

  // Remove invalid/expired tokens returned by Expo
  const result = await res.json();
  const ticket = result.data;
  if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
    const to = message.to;
    await supabase.from('users').update({ push_token: null }).eq('push_token', to);
  }

  return new Response('ok', { status: 200 });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getPushToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', userId)
    .single();
  return (data?.push_token as string | null) ?? null;
}

async function getUserName(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single();
  return (data?.name as string | null) ?? 'Someone';
}

async function getItemName(
  supabase: ReturnType<typeof createClient>,
  itemId: string,
): Promise<string> {
  const { data } = await supabase
    .from('items')
    .select('name')
    .eq('id', itemId)
    .single();
  return (data?.name as string | null) ?? 'an item';
}

// ── Message builder ───────────────────────────────────────────────────────────

async function buildMessage(
  supabase: ReturnType<typeof createClient>,
  payload: WebhookPayload,
): Promise<ExpoPushMessage | null> {
  const { type, table, record, old_record } = payload;

  // ── borrow_requests ────────────────────────────────────────────────────────
  if (table === 'borrow_requests') {
    const ownerId = record.owner_id as string;
    const requesterId = record.requester_id as string;
    const itemId = record.item_id as string;
    const status = record.status as string;
    const oldStatus = old_record?.status as string | undefined;

    if (type === 'INSERT' && status === 'pending') {
      // New request → notify owner
      const token = await getPushToken(supabase, ownerId);
      if (!token) return null;
      const [requesterName, itemName] = await Promise.all([
        getUserName(supabase, requesterId),
        getItemName(supabase, itemId),
      ]);
      return {
        to: token,
        title: 'New Borrow Request',
        body: `${requesterName} wants to borrow "${itemName}"`,
        data: { type: 'borrow_request_new', itemId },
        sound: 'default',
      };
    }

    if (type === 'UPDATE' && oldStatus !== status) {
      if (status === 'approved') {
        // Request approved → notify requester
        const token = await getPushToken(supabase, requesterId);
        if (!token) return null;
        const [ownerName, itemName] = await Promise.all([
          getUserName(supabase, ownerId),
          getItemName(supabase, itemId),
        ]);
        return {
          to: token,
          title: 'Request Approved 🎉',
          body: `${ownerName} approved your request for "${itemName}"`,
          data: { type: 'borrow_request_approved', itemId },
          sound: 'default',
        };
      }

      if (status === 'denied') {
        // Request denied → notify requester
        const token = await getPushToken(supabase, requesterId);
        if (!token) return null;
        const [ownerName, itemName] = await Promise.all([
          getUserName(supabase, ownerId),
          getItemName(supabase, itemId),
        ]);
        return {
          to: token,
          title: 'Request Declined',
          body: `${ownerName} declined your request for "${itemName}"`,
          data: { type: 'borrow_request_denied' },
          sound: 'default',
        };
      }

      if (status === 'cancelled' && oldStatus === 'pending') {
        // Requester cancelled a pending request → notify owner
        const token = await getPushToken(supabase, ownerId);
        if (!token) return null;
        const [requesterName, itemName] = await Promise.all([
          getUserName(supabase, requesterId),
          getItemName(supabase, itemId),
        ]);
        return {
          to: token,
          title: 'Request Cancelled',
          body: `${requesterName} cancelled their request for "${itemName}"`,
          data: { type: 'borrow_request_cancelled' },
          sound: 'default',
        };
      }
    }
  }

  // ── friend_connections ─────────────────────────────────────────────────────
  if (table === 'friend_connections') {
    const userId = record.user_id as string;
    const friendUserId = record.friend_user_id as string;
    const status = record.status as string;
    const oldStatus = old_record?.status as string | undefined;

    if (type === 'INSERT' && status === 'pending') {
      // Friend request sent → notify recipient
      const token = await getPushToken(supabase, friendUserId);
      if (!token) return null;
      const senderName = await getUserName(supabase, userId);
      return {
        to: token,
        title: 'Friend Request',
        body: `${senderName} wants to be friends`,
        data: { type: 'friend_request_new' },
        sound: 'default',
      };
    }

    if (type === 'UPDATE' && oldStatus !== status && status === 'active') {
      // Friend request accepted → notify the original sender
      const token = await getPushToken(supabase, userId);
      if (!token) return null;
      const friendName = await getUserName(supabase, friendUserId);
      return {
        to: token,
        title: 'Friend Request Accepted 🎉',
        body: `${friendName} accepted your friend request`,
        data: { type: 'friend_request_accepted' },
        sound: 'default',
      };
    }
  }

  return null;
}
