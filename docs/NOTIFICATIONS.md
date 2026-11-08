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
of `borrow_requests` and `friend_connections`, and on `items` UPDATEs that
change `is_unavailable`, `pending_recipient_id` or `borrowed_by` (trigger
`items_notify_push`, widened in migration 048 — before that it only fired on
`is_unavailable`, so #7 never actually sent). All dispatch logic lives in
`buildMessages()` in `supabase/functions/push-notifications/index.ts`.

| # | Situation | DB trigger | Notified | Type (`NotificationData.type`) |
|---|---|---|---|---|
| 1 | New borrow request created | `borrow_requests` INSERT, `status='pending'` | Item owner | `borrow_request_new` |
| 2 | Request approved | `borrow_requests` UPDATE → `status='approved'` | Requester | `borrow_request_approved` |
| 3 | Request denied | `borrow_requests` UPDATE → `status='denied'` | Requester | `borrow_request_denied` |
| 4 | Pending request cancelled by requester | `borrow_requests` UPDATE, `pending`→`cancelled` | Item owner | `borrow_request_cancelled` |
| 5 | Friend request sent | `friend_connections` INSERT, `status='pending'` | Recipient | `friend_request_new` |
| 6 | Friend request accepted | `friend_connections` UPDATE → `status='active'` | Original sender | `friend_request_accepted` |
| 7 | Pending handoff assigned (pickup or return) | `items` UPDATE, `pending_recipient_id` newly set | New recipient — title reads "Confirm Pickup" or "Confirm Return" depending on whether the recipient is the owner | `confirm_pickup` / `confirm_return` |
| 8 | Item flipped unavailable → available | `items` UPDATE, `is_unavailable` `true`→`false` | Every user with an open row in `item_availability_subscriptions` for that item (sent individually, then each subscription is stamped `notified_at`) | `item_available` |
| 12 | Owner claims an item back ("Claim back" button, `forceReturnItem`) | `items` UPDATE, `borrowed_by` set → `NULL` where the old `pending_recipient_id` was **not** the owner (a normal confirmed return has the owner as pending recipient and is excluded) | The borrower who had it — "Item returned: Alana marked "Dune" as returned." | `item_claimed_back` |

## Scheduled (cron-based) — daily reminder digest

One pg_cron + pg_net job, `reminder-digest-daily` (daily 09:00 UTC), calls
`supabase/functions/reminder-digest` with the Vault-stored bearer secret
`return_reminders_cron_secret`. It replaced the old `return-reminders-weekly`
and `due-soon-reminders-daily` jobs in migration 048.

Each run looks at every active loan, puts each item into **at most one**
borrower-side bucket, then sends **at most one push per person**:

- **One item** for that person → the specific copy below, tapping through to
  the item.
- **Several items** → one grouped push ("You have 3 items due back", or a
  mixed summary like "2 items due back now, 1 due soon, 1 item due back to
  you"), type `reminder_digest` with `target` = `borrowed` (opens
  `/borrowed`), `lent` (Library → Lent Out) or `home` (mixed owner/borrower).

Single-item copy for #9/#10 stays DB-driven via the singleton
`notification_settings` table (editable in Supabase Studio without a
redeploy); #11 and all grouped copy live in the function.

| # | Bucket | Condition (item borrowed, not returned) | Notified | Once-guard | Type (single item) |
|---|---|---|---|---|---|
| 11 | Time's up (overdue) | `due_date <= now` | **Both** the borrower ("Dune" is due back to Alana now) and the owner ("Dune" is due back from Sam) | `overdue_notified_at` — once per loan | `item_overdue` |
| 10 | Due soon | `due_date` in the future and `<= now + due_soon_reminder_days_before` (default 7d) | Borrower | `due_soon_reminded_at` — once per loan | `item_due_soon` |
| 9 | "Still got this?" | `borrowed_date <= now - reminder_interval_days` (default 7d), not reminded within that window (`last_reminder_sent_at`); only if the item didn't land in #10/#11 this run | Borrower | `last_reminder_sent_at` — repeats every interval | `return_reminder` |

Once-guards are stamped even when the recipient has no push token, so
someone who enables notifications later doesn't get a backlog.
`overdue_notified_at` and `due_soon_reminded_at` are reset to `NULL` by the
`items_reset_reminder_flags` BEFORE UPDATE trigger whenever `borrowed_by` or
`due_date` changes (new borrower, return, or due date moved), so they fire
again next loan.

**#10 only fires when `due_date` is actually set**, which only happens when
the owner has configured **Max Borrow Duration** on the item (`items.max_borrow_days`,
a structured day-count — see `components/MaxBorrowDurationInput.tsx`).
`due_date` is (re)computed from `max_borrow_days` at the moment pickup is
**confirmed** (`confirmHandoff` in `lib/services/database.ts`), not at
request approval — so a hand-off to the next queued borrower always gets a
fresh window instead of inheriting the previous borrower's due date.
Reminder #10 fires **once per loan**, a fixed number of days before
`due_date` (`due_soon_reminder_days_before`, default 7) — the lead time is
constant, not proportional to `max_borrow_days`. A 3-week loan and a
10-day loan both get their reminder 7 days out by default.

Items with no `max_borrow_days` configured never get a due-soon (#10) or
time's-up (#11) push — there's no due date. They still get the "Still got
this?" nudge (#9), which is keyed off `borrowed_date`, not `due_date`.
After #11 fires, an overdue item falls back into #9 on its normal interval.

## Known gaps (documented so they don't get assumed away)

- **09:00 UTC is evening in Australia** (19:00/20:00 AEST/AEDT). There's no
  per-user timezone, so everyone gets the digest at the same instant.

## Manual / ad-hoc

`supabase/functions/send-notification/index.ts` — a bearer-auth'd
(`CRON_SECRET`) endpoint for one-off broadcasts to specific `userIds` or
everyone. Not wired to any DB trigger; used for testing/manual sends only.

## Dead-token cleanup

Every push send (trigger-based and cron-based) checks the Expo response for
`DeviceNotRegistered` errors and clears `users.push_token` for those users,
so a stale token doesn't keep silently failing forever.
