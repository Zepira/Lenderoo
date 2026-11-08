import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const DAY_MS = 24 * 60 * 60 * 1000;

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

interface LoanRow {
  id: string;
  name: string;
  user_id: string;
  borrowed_by: string;
  borrowed_date: string | null;
  due_date: string | null;
  due_soon_reminded_at: string | null;
  overdue_notified_at: string | null;
  last_reminder_sent_at: string | null;
}

type Kind = 'overdue' | 'due_soon' | 'still_got' | 'owner_overdue';

interface Entry {
  kind: Kind;
  item: LoanRow;
  daysRemaining?: number;
}

// Scheduled daily via pg_cron (supabase/migrations/048_reminder_digest_and_overdue.sql)
// with the CRON_SECRET as a bearer token. Replaces the old return-reminders
// (weekly) and due-soon-reminders (daily) functions: each person gets at most
// one reminder push per run, grouped when several items apply. See
// docs/NOTIFICATIONS.md.
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
    .select('reminder_interval_days, reminder_title, reminder_body, due_soon_reminder_days_before, due_soon_reminder_title, due_soon_reminder_body')
    .eq('id', true)
    .single();

  const intervalDays = settings?.reminder_interval_days ?? 7;
  const stillGotTitle = settings?.reminder_title ?? 'Still got this?';
  const stillGotBody =
    settings?.reminder_body ?? 'You borrowed "{{item}}" a week ago. Time to return it?';
  const dueSoonDays = settings?.due_soon_reminder_days_before ?? 7;
  const dueSoonTitle = settings?.due_soon_reminder_title ?? 'Due soon';
  const dueSoonBody =
    settings?.due_soon_reminder_body ?? '"{{item}}" is due back in {{days}} days.';

  const now = new Date();
  const nowMs = now.getTime();
  const stillGotCutoffMs = nowMs - intervalDays * DAY_MS;

  // Every active loan (borrowed, not returned). Classified in code so each
  // item lands in at most one borrower-side bucket per run.
  const { data: loans, error } = await supabase
    .from('items')
    .select(
      'id, name, user_id, borrowed_by, borrowed_date, due_date, ' +
        'due_soon_reminded_at, overdue_notified_at, last_reminder_sent_at',
    )
    .not('borrowed_by', 'is', null)
    .is('returned_date', null)
    .returns<LoanRow[]>();

  if (error) return new Response(`query error: ${error.message}`, { status: 500 });
  if (!loans || loans.length === 0) return new Response('no active loans', { status: 200 });

  const byUser = new Map<string, Entry[]>();
  const add = (userId: string, entry: Entry) => {
    const list = byUser.get(userId) ?? [];
    list.push(entry);
    byUser.set(userId, list);
  };

  const overdueIds: string[] = [];
  const dueSoonIds: string[] = [];
  const stillGotIds: string[] = [];

  for (const item of loans) {
    const dueMs = item.due_date ? new Date(item.due_date).getTime() : null;

    if (dueMs !== null && dueMs <= nowMs) {
      // Time's up — tell both sides, once per loan.
      if (!item.overdue_notified_at) {
        add(item.borrowed_by, { kind: 'overdue', item });
        add(item.user_id, { kind: 'owner_overdue', item });
        overdueIds.push(item.id);
        continue;
      }
    } else if (
      dueMs !== null &&
      dueMs <= nowMs + dueSoonDays * DAY_MS &&
      !item.due_soon_reminded_at
    ) {
      add(item.borrowed_by, {
        kind: 'due_soon',
        item,
        daysRemaining: Math.max(1, Math.ceil((dueMs - nowMs) / DAY_MS)),
      });
      dueSoonIds.push(item.id);
      continue;
    }

    // "Still got this?" — on its own cadence, keyed off borrowed_date.
    const borrowedMs = item.borrowed_date ? new Date(item.borrowed_date).getTime() : null;
    const lastMs = item.last_reminder_sent_at
      ? new Date(item.last_reminder_sent_at).getTime()
      : null;
    if (
      borrowedMs !== null &&
      borrowedMs <= stillGotCutoffMs &&
      (lastMs === null || lastMs <= stillGotCutoffMs)
    ) {
      add(item.borrowed_by, { kind: 'still_got', item });
      stillGotIds.push(item.id);
    }
  }

  if (byUser.size === 0) return new Response('no reminders due', { status: 200 });

  const { data: users } = await supabase
    .from('users')
    .select('id, name, push_token')
    // Overdue entries are always added for both owner and borrower, so every
    // name the copy needs is already a key here.
    .in('id', [...byUser.keys()])
    .returns<{ id: string; name: string | null; push_token: string | null }[]>();
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const nameOf = (id: string) => userById.get(id)?.name ?? 'a friend';

  const messages: ExpoPushMessage[] = [];
  for (const [userId, entries] of byUser) {
    const token = userById.get(userId)?.push_token;
    if (!token) continue;
    messages.push({
      to: token,
      sound: 'default',
      ...buildMessage(entries, {
        nameOf,
        stillGotTitle,
        stillGotBody,
        dueSoonTitle,
        dueSoonBody,
      }),
    });
  }

  // Stamp flags whether or not a token was on file, so a user who enables
  // notifications later isn't hit with a backlog.
  const stamp = new Date().toISOString();
  if (overdueIds.length) {
    await supabase.from('items').update({ overdue_notified_at: stamp }).in('id', overdueIds);
  }
  if (dueSoonIds.length) {
    await supabase.from('items').update({ due_soon_reminded_at: stamp }).in('id', dueSoonIds);
  }
  if (stillGotIds.length) {
    await supabase.from('items').update({ last_reminder_sent_at: stamp }).in('id', stillGotIds);
  }

  if (messages.length === 0) return new Response('no reachable recipients', { status: 200 });

  // Expo accepts up to 100 messages per request.
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) continue;
    sent += batch.length;

    const result = await res.json();
    const tickets = Array.isArray(result.data) ? result.data : [result.data];
    const deadTokens = tickets
      .map((t: any, j: number) =>
        t?.details?.error === 'DeviceNotRegistered' ? batch[j].to : null,
      )
      .filter(Boolean);
    if (deadTokens.length > 0) {
      await supabase.from('users').update({ push_token: null }).in('push_token', deadTokens);
    }
  }

  return new Response(`sent ${sent} digest pushes`, { status: 200 });
});

// ── Copy ──────────────────────────────────────────────────────────────────

interface CopyCtx {
  nameOf: (userId: string) => string;
  stillGotTitle: string;
  stillGotBody: string;
  dueSoonTitle: string;
  dueSoonBody: string;
}

function fill(template: string, item: string, days?: number): string {
  return template.replaceAll('{{item}}', item).replaceAll('{{days}}', String(days ?? ''));
}

/** `"A"`, `"A" and "B"`, `"A", "B" and 2 more` */
function listNames(entries: Entry[]): string {
  const names = entries.map((e) => `"${e.item.name}"`);
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function buildMessage(
  entries: Entry[],
  ctx: CopyCtx,
): Pick<ExpoPushMessage, 'title' | 'body' | 'data'> {
  // Single item → specific copy, taps straight through to the item.
  if (entries.length === 1) {
    const { kind, item, daysRemaining } = entries[0];
    switch (kind) {
      case 'overdue':
        return {
          title: "Time's up",
          body: `"${item.name}" is due back to ${ctx.nameOf(item.user_id)} now.`,
          data: { type: 'item_overdue', itemId: item.id },
        };
      case 'owner_overdue':
        return {
          title: "Time's up",
          body: `"${item.name}" is due back from ${ctx.nameOf(item.borrowed_by)}.`,
          data: { type: 'item_overdue', itemId: item.id },
        };
      case 'due_soon':
        return {
          title: fill(ctx.dueSoonTitle, item.name, daysRemaining),
          body: fill(ctx.dueSoonBody, item.name, daysRemaining),
          data: { type: 'item_due_soon', itemId: item.id },
        };
      case 'still_got':
        return {
          title: fill(ctx.stillGotTitle, item.name),
          body: fill(ctx.stillGotBody, item.name),
          data: { type: 'return_reminder', itemId: item.id },
        };
    }
  }

  const of = (kind: Kind) => entries.filter((e) => e.kind === kind);
  const overdue = of('overdue');
  const dueSoon = of('due_soon');
  const stillGot = of('still_got');
  const ownerOverdue = of('owner_overdue');

  const borrowerCount = overdue.length + dueSoon.length + stillGot.length;
  const target = ownerOverdue.length === 0 ? 'borrowed' : borrowerCount === 0 ? 'lent' : 'home';
  const data = { type: 'reminder_digest', target };

  // Several items, all the same kind → one focused message.
  if (overdue.length === entries.length) {
    return {
      title: `You have ${plural(overdue.length, 'item')} due back`,
      body: `Time's up on ${listNames(overdue)}.`,
      data,
    };
  }
  if (ownerOverdue.length === entries.length) {
    return {
      title: `${plural(ownerOverdue.length, 'item')} due back to you`,
      body: `Time's up on ${listNames(ownerOverdue)}.`,
      data,
    };
  }
  if (dueSoon.length === entries.length) {
    return {
      title: `You have ${plural(dueSoon.length, 'item')} due back soon`,
      body: `${listNames(dueSoon)} ${dueSoon.length === 1 ? 'is' : 'are'} due back soon.`,
      data,
    };
  }
  if (stillGot.length === entries.length) {
    return {
      title: 'Still got these?',
      body: `You've had ${listNames(stillGot)} for a while. Time to return them?`,
      data,
    };
  }

  // Mixed → a short summary of each bucket.
  const parts: string[] = [];
  if (overdue.length) parts.push(`${plural(overdue.length, 'item')} due back now`);
  if (dueSoon.length) parts.push(`${dueSoon.length} due back soon`);
  if (stillGot.length) parts.push(`${stillGot.length} you've had a while`);
  if (ownerOverdue.length) {
    parts.push(`${plural(ownerOverdue.length, 'item')} due back to you`);
  }
  return {
    title: `You have ${plural(entries.length, 'item')} to check on`,
    body: `${parts.join(', ')}.`,
    data,
  };
}
