# Notifications

Every situation that sends the user a push notification, plus the DB
mechanics behind each one. **Keep this file up to date** — see the rule in
`CLAUDE.md`: any change to a notification trigger, its copy, or its timing
must update the matching row here in the same change.

All pushes go through the Expo Push API (`https://exp.host/--/api/v2/push/send`)
to the token in `users.push_token` (see `lib/notifications.ts` for
registration and tap-routing, `NotificationData` for the full set of
payload shapes the client understands).

## Trigger-based (fires immediately on a DB write)

A Postgres trigger (`notify_push_webhook()`, `supabase/migrations/028_push_notification_webhooks.sql`)
fires a webhook to the `push-notifications` edge function on INSERT/UPDATE
of `borrow_requests`, `friend_connections`, and `items.is_unavailable`. All
dispatch logic lives in `buildMessages()` in
`supabase/functions/push-notifications/index.ts`.

| # | Situation | DB trigger | Notified | Type (`NotificationData.type`) |
|---|---|---|---|---|
| 1 | New borrow request created | `borrow_requests` INSERT, `status='pending'` | Item owner | `borrow_request_new` |
| 2 | Request approved | `borrow_requests` UPDATE → `status='approved'` | Requester | `borrow_request_approved` |
| 3 | Request denied | `borrow_requests` UPDATE → `status='denied'` | Requester | `borrow_request_denied` |
| 4 | Pending request cancelled by requester | `borrow_requests` UPDATE, `pending`→`cancelled` | Item owner | `borrow_request_cancelled` |
| 5 | Friend request sent | `friend_connections` INSERT, `status='pending'` | Recipient | `friend_request_new` |
| 6 | Friend request accepted | `friend_connections` UPDATE → `status='active'` | Original sender | `friend_request_accepted` |
| 7 | Pending handoff assigned (pickup or return) | `items` UPDATE, `pending_recipient_id` newly set | New recipient — title reads "Confirm Pickup" or "Confirm Return" depending on whether the recipient is the owner | *(no dedicated NotificationData type yet — routes generically)* |
| 8 | Item flipped unavailable → available | `items` UPDATE, `is_unavailable` `true`→`false` | Every user with an open row in `item_availability_subscriptions` for that item (sent individually, then each subscription is stamped `notified_at`) | `item_available` |

## Scheduled (cron-based)

Both jobs are pg_cron + pg_net, calling their edge function with a
Vault-stored bearer secret (`return_reminders_cron_secret` — shared by
both). Copy/timing for both is DB-driven via the singleton
`notification_settings` table, editable in Supabase Studio without a
redeploy.

| # | Situation | Schedule | Query | Notified | Type |
|---|---|---|---|---|---|
| 9 | "Still got this?" — item borrowed a while, unprompted | Weekly, Monday 09:00 UTC (`return-reminders-weekly`) | `items` where `borrowed_by` set, not returned, `borrowed_date <= now - reminder_interval_days` (default 7d), and not reminded within that same window (`last_reminder_sent_at`) | Current borrower | `return_reminder` |
| 10 | Due-soon reminder | Daily, 09:00 UTC (`due-soon-reminders-daily`) | `items` where `borrowed_by` set, not returned, `due_date` set and in the future, `due_date <= now + due_soon_reminder_days_before` (default 7d), and `due_soon_reminded_at IS NULL` for this loan | Current borrower | `item_due_soon` |

**#10 only fires when `due_date` is actually set**, which only happens when
the owner has configured **Max Borrow Duration** on the item (`items.max_borrow_days`,
a structured day-count — see `components/MaxBorrowDurationInput.tsx`).
`due_date` is (re)computed from `max_borrow_days` at the moment pickup is
**confirmed** (`confirmHandoff` in `lib/services/database.ts`), not at
request approval — so a hand-off to the next queued borrower always gets a
fresh window instead of inheriting the previous borrower's due date.
`due_soon_reminded_at` is reset to `NULL` on every new pickup and on return,
so the reminder can fire again next loan.

Reminder #10 fires **once per loan**, a fixed number of days before
`due_date` (`due_soon_reminder_days_before`, default 7) — the lead time is
constant, not proportional to `max_borrow_days`. A 3-week loan and a
10-day loan both get their reminder 7 days out by default.

Items with no `max_borrow_days` configured never get a due-soon reminder —
there's no due date to count down to. They still get the weekly "Still got
this?" nudge (#9), which is keyed off `borrowed_date`, not `due_date`.

## Known gaps (documented so they don't get assumed away)

- **No overdue push.** `calculateItemStatus()` (`lib/utils.ts`) computes an
  `"overdue"` status once `due_date` has passed, and the UI reflects it, but
  nothing proactively notifies either party when an item goes overdue. The
  only thing that nudges a borrower after the due date passes is the
  weekly return-reminder (#9), which is on its own unrelated schedule.
- **#7 (pending handoff) has no dedicated `NotificationData` type** — the
  push still sends and routes, just without itemId-aware tap targeting the
  other entries get. Fine for now, but a fix here should get its own row
  update, not silently ride along with an unrelated change.

## Manual / ad-hoc

`supabase/functions/send-notification/index.ts` — a bearer-auth'd
(`CRON_SECRET`) endpoint for one-off broadcasts to specific `userIds` or
everyone. Not wired to any DB trigger; used for testing/manual sends only.

## Dead-token cleanup

Every push send (trigger-based and cron-based) checks the Expo response for
`DeviceNotRegistered` errors and clears `users.push_token` for those users,
so a stale token doesn't keep silently failing forever.
