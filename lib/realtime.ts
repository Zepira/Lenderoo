import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Subscribe to a channel with status logging. A misconfigured channel
 * (table not added to the supabase_realtime publication, an RLS gap, a
 * transient network/connection issue) fails as a CHANNEL_ERROR or
 * TIMED_OUT status passed to the subscribe callback — if nothing reads
 * that callback, the failure is invisible until a user notices missing
 * live updates and reports it as a vague "realtime error". This is
 * exactly what happened with borrow_history (see
 * supabase/migrations/047_borrow_history_realtime.sql) — logging here so
 * the next gap like that shows up in logs immediately instead of going
 * unnoticed for a long time.
 *
 * Deliberately does not throw or surface anything to the user — a failed
 * realtime subscription should degrade to "not live" (screens already
 * refetch on focus/pull-to-refresh), not break the screen.
 */
export function subscribeLogged(channel: RealtimeChannel, label: string): RealtimeChannel {
  return channel.subscribe((status, err) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error(`[realtime] "${label}" subscription failed:`, status, err);
    }
  })
}
