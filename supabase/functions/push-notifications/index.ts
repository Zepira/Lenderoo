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

  const messages = await buildMessages(supabase, payload);
  if (messages.length === 0) {
    return new Response('no notification needed', { status: 200 });
  }

  for (const message of messages) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(message),
    });

    if (!res.ok) continue;

    // Remove invalid/expired tokens returned by Expo
    const result = await res.json();
    const ticket = result.data;
    if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
      await supabase.from('users').update({ push_token: null }).eq('push_token', message.to);
    }
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

async function buildMessages(
  supabase: ReturnType<typeof createClient>,
  payload: WebhookPayload,
): Promise<ExpoPushMessage[]> {
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
      if (!token) return [];
      const [requesterName, itemName] = await Promise.all([
        getUserName(supabase, requesterId),
        getItemName(supabase, itemId),
      ]);
      return [{
        to: token,
        title: 'New Borrow Request',
        body: `${requesterName} wants to borrow "${itemName}"`,
        data: { type: 'borrow_request_new', itemId },
        sound: 'default',
      }];
    }

    if (type === 'UPDATE' && oldStatus !== status) {
      if (status === 'approved') {
        // Request approved → notify requester
        const token = await getPushToken(supabase, requesterId);
        if (!token) return [];
        const [ownerName, itemName] = await Promise.all([
          getUserName(supabase, ownerId),
          getItemName(supabase, itemId),
        ]);
        return [{
          to: token,
          title: 'Request Approved 🎉',
          body: `${ownerName} approved your request for "${itemName}"`,
          data: { type: 'borrow_request_approved', itemId },
          sound: 'default',
        }];
      }

      if (status === 'denied') {
        // Request denied → notify requester
        const token = await getPushToken(supabase, requesterId);
        if (!token) return [];
        const [ownerName, itemName] = await Promise.all([
          getUserName(supabase, ownerId),
          getItemName(supabase, itemId),
        ]);
        return [{
          to: token,
          title: 'Request Declined',
          body: `${ownerName} declined your request for "${itemName}"`,
          data: { type: 'borrow_request_denied' },
          sound: 'default',
        }];
      }

      if (status === 'cancelled' && oldStatus === 'pending') {
        // Requester cancelled a pending request → notify owner
        const token = await getPushToken(supabase, ownerId);
        if (!token) return [];
        const [requesterName, itemName] = await Promise.all([
          getUserName(supabase, requesterId),
          getItemName(supabase, itemId),
        ]);
        return [{
          to: token,
          title: 'Request Cancelled',
          body: `${requesterName} cancelled their request for "${itemName}"`,
          data: { type: 'borrow_request_cancelled' },
          sound: 'default',
        }];
      }
    }

    return [];
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
      if (!token) return [];
      const senderName = await getUserName(supabase, userId);
      return [{
        to: token,
        title: 'Friend Request',
        body: `${senderName} wants to be friends`,
        data: { type: 'friend_request_new' },
        sound: 'default',
      }];
    }

    if (type === 'UPDATE' && oldStatus !== status && status === 'active') {
      // Friend request accepted → notify the original sender
      const token = await getPushToken(supabase, userId);
      if (!token) return [];
      const friendName = await getUserName(supabase, friendUserId);
      return [{
        to: token,
        title: 'Friend Request Accepted 🎉',
        body: `${friendName} accepted your friend request`,
        data: { type: 'friend_request_accepted' },
        sound: 'default',
      }];
    }

    return [];
  }

  // ── items (availability, pending handoff) ────────────────────────────────
  if (table === 'items') {
    const itemId = record.id as string;
    const wasUnavailable = old_record?.is_unavailable === true;
    const isNowAvailable = record.is_unavailable === false;

    // Pending handoff just assigned to someone — they need to confirm
    // pickup (new borrower) or confirm return (owner reclaiming the item).
    const newRecipientId = record.pending_recipient_id as string | null;
    const oldRecipientId = old_record?.pending_recipient_id as string | null | undefined;
    if (type === 'UPDATE' && newRecipientId && newRecipientId !== oldRecipientId) {
      const token = await getPushToken(supabase, newRecipientId);
      if (token) {
        const ownerId = record.user_id as string;
        const isReturn = newRecipientId === ownerId;
        const itemName = await getItemName(supabase, itemId);
        return [{
          to: token,
          title: isReturn ? 'Confirm Return' : 'Confirm Pickup',
          body: `"${itemName}" is waiting for you to confirm`,
          data: { type: isReturn ? 'confirm_return' : 'confirm_pickup', itemId },
          sound: 'default',
        }];
      }
    }

    if (type === 'UPDATE' && wasUnavailable && isNowAvailable) {
      // Owner flipped the item back to available → notify everyone waiting
      const { data: subs } = await supabase
        .from('item_availability_subscriptions')
        .select('user_id')
        .eq('item_id', itemId)
        .is('notified_at', null);

      if (!subs || subs.length === 0) return [];

      const itemName = await getItemName(supabase, itemId);
      const messages: ExpoPushMessage[] = [];
      for (const sub of subs) {
        const token = await getPushToken(supabase, sub.user_id as string);
        if (token) {
          messages.push({
            to: token,
            title: 'Now Available',
            body: `"${itemName}" is available to borrow again`,
            data: { type: 'item_available', itemId },
            sound: 'default',
          });
        }
      }

      // Clear all waiting subscriptions regardless of whether a push token
      // was on file, so the same subscriber isn't notified again next time.
      await supabase
        .from('item_availability_subscriptions')
        .update({ notified_at: new Date().toISOString() })
        .eq('item_id', itemId)
        .is('notified_at', null);

      return messages;
    }

    return [];
  }

  return [];
}
