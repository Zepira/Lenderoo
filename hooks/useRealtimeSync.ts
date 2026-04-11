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
export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const itemsChannel = supabase
      .channel('rt-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
        },
      )
      .subscribe()

    const friendsChannel = supabase
      .channel('rt-friends')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_connections' },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.friends.all })
        },
      )
      .subscribe()

    const requestsChannel = supabase
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

    return () => {
      supabase.removeChannel(itemsChannel)
      supabase.removeChannel(friendsChannel)
      supabase.removeChannel(requestsChannel)
    }
  }, [queryClient])
}
