import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from 'lib/supabase'
import { queryKeys } from 'lib/query-client'

/**
 * Sets up ONE Supabase realtime subscription per table for the whole app.
 * When a change arrives, the relevant TanStack Query caches are invalidated
 * and refetched in the background — no full component re-renders needed.
 *
 * Call this once inside the authenticated layout (app/(tabs)/_layout.tsx).
 *
 * This is a true module-level singleton, deliberately NOT tied to the
 * calling component's mount/unmount lifecycle: (tabs)/_layout.tsx can
 * mount/unmount/remount in quick succession (e.g. auth state flipping
 * during sign-in), and tearing these channels down + recreating them on
 * every remount raced against supabase-js's own internal channel-removal
 * timing (a channel only leaves the client's tracking list via a 'close'
 * event that fires on a *successful* unsubscribe round-trip — teardown()
 * alone does not trigger it, so a fast remount could still find the old
 * channel "stale-but-not-yet-removed" and crash calling .on() on it after
 * it was already subscribed). Initializing once per JS process sidesteps
 * that race entirely instead of trying to out-run it.
 */
const SYNCED_TOPICS = ['rt-items', 'rt-friends', 'rt-borrow-requests']

let initialized = false

function setup(queryClient: ReturnType<typeof useQueryClient>) {
  if (initialized) return
  initialized = true

  // Defensive one-time sweep: if a previous JS instance (e.g. a dev
  // Fast Refresh) left any of these channels registered, clear them first
  // so this init can't collide with a leftover.
  const stale = supabase
    .getChannels()
    .filter((c) => SYNCED_TOPICS.some((t) => c.topic === `realtime:${t}`))
  for (const channel of stale) {
    channel.unsubscribe()
    channel.teardown()
    ;(channel.socket as any)._remove(channel)
  }

  supabase
    .channel('rt-items')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'items' },
      () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      },
    )
    .subscribe()

  supabase
    .channel('rt-friends')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friend_connections' },
      () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.all })
      },
    )
    .subscribe()

  supabase
    .channel('rt-borrow-requests')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'borrow_requests' },
      () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.borrowRequests.incoming,
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.borrowRequests.outgoing,
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.borrowRequests.count,
        })
        // Approving a request also changes item status
        queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      },
    )
    .subscribe()
}

export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    setup(queryClient)
  }, [queryClient])
}
