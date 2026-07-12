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
 */
const SYNCED_TOPICS = ['rt-items', 'rt-friends', 'rt-borrow-requests']

// supabase.removeChannel() only removes the channel from the client's
// internal list (via channel.teardown()) if unsubscribe() resolves 'ok' —
// on a timeout/error it silently leaves the channel registered, which then
// permanently reproduces "cannot add postgres_changes callbacks after
// subscribe()" on every future mount (channel() reuses by topic name
// regardless of subscribe state). Tear down unconditionally ourselves
// instead of trusting that conditional.
async function forceRemoveChannel(channel: ReturnType<typeof supabase.channel>) {
  try {
    await channel.unsubscribe()
  } catch {
    // ignore — we tear down below regardless of outcome
  }
  channel.teardown()
}

export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let cancelled = false
    let itemsChannel: ReturnType<typeof supabase.channel> | undefined
    let friendsChannel: ReturnType<typeof supabase.channel> | undefined
    let requestsChannel: ReturnType<typeof supabase.channel> | undefined

    const setup = async () => {
      // On a fast remount (e.g. auth state flipping during sign-in), a
      // previous run's cleanup may still be mid-teardown — supabase reuses a
      // channel by topic name regardless of its subscribe state, so calling
      // .on() on that stale, already-subscribed channel throws. Clear out
      // any leftovers for our topics before creating fresh ones.
      const stale = supabase
        .getChannels()
        .filter((c) => SYNCED_TOPICS.some((t) => c.topic === `realtime:${t}`))
      await Promise.all(stale.map(forceRemoveChannel))
      if (cancelled) return

      itemsChannel = supabase
        .channel('rt-items')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'items' },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
          },
        )
        .subscribe()

      friendsChannel = supabase
        .channel('rt-friends')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friend_connections' },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.friends.all })
          },
        )
        .subscribe()

      requestsChannel = supabase
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

    setup()

    return () => {
      cancelled = true
      if (itemsChannel) forceRemoveChannel(itemsChannel)
      if (friendsChannel) forceRemoveChannel(friendsChannel)
      if (requestsChannel) forceRemoveChannel(requestsChannel)
    }
  }, [queryClient])
}
