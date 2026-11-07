import { useMemo } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Item, ItemFilters } from 'lib/types'
import * as db from '@/lib/services/database'
import { getAllFriendsItems } from '@/lib/services/friends'
import { queryKeys } from 'lib/query-client'

export function useItems(filters?: ItemFilters) {
  const result = useQuery({
    queryKey: queryKeys.items.filtered(filters),
    queryFn: () => db.queryItems(filters),
  })
  return {
    items: result.data ?? [],
    loading: result.isLoading,
    error: result.error,
    refresh: result.refetch,
  }
}

/**
 * Items owned by any of the current user's friends (Explore screen). Keyed
 * under the `['items', ...]` prefix so the global realtime sync in
 * useRealtimeSync.ts (which invalidates on any items table change) keeps
 * this live — matches useItemsByIds() below, fixing the same staleness bug
 * where a screen's own local fetch-once-on-focus never picks up an item's
 * pendingRecipientId changing after a friend approves your request.
 */
export function useFriendsItems() {
  const result = useQuery({
    queryKey: queryKeys.items.friends,
    queryFn: getAllFriendsItems,
  })
  return {
    items: result.data ?? [],
    loading: result.isLoading,
    // Distinct from `loading` (only true before any data has ever loaded) —
    // this stays true for pull-to-refresh on every refetch, matching what a
    // manual "loading" flag toggled around each fetch used to do.
    refreshing: result.isFetching,
    error: result.error,
    refresh: result.refetch,
  }
}

/**
 * Fetch a specific set of items (e.g. items I don't own, so they're absent
 * from useItems()) by id, each as its own react-query entry keyed the same
 * way useItem() keys a single item — so the global realtime sync in
 * useRealtimeSync.ts (which invalidates the whole `['items']` prefix on any
 * items table change) keeps these live too, instead of going stale the way
 * a one-off fetch-and-cache-in-local-state would.
 */
export function useItemsByIds(ids: string[]) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.items.detail(id),
      queryFn: () => db.getItemById(id),
    })),
  })
  const items = results
    .map((r) => r.data)
    .filter((i): i is Item => !!i)
  const loading = results.some((r) => r.isLoading)
  return { items, loading }
}

export function useItem(id: string | null) {
  const result = useQuery({
    queryKey: queryKeys.items.detail(id ?? ''),
    queryFn: () => db.getItemById(id!),
    enabled: !!id,
  })
  return {
    item: result.data ?? null,
    loading: result.isLoading,
    error: result.error,
    refresh: result.refetch,
  }
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (itemData: Parameters<typeof db.createItem>[0]) =>
      db.createItem(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
  return {
    createItem: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Item> }) =>
      db.updateItem(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(id) })
    },
  })
  // Keep the original (id, updates) call signature intact so no screens break
  return {
    updateItem: (id: string, updates: Partial<Item>) =>
      mutation.mutateAsync({ id, updates }),
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (id: string) => db.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
  return {
    deleteItem: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useInitiateReturn() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ id, recipientId }: { id: string; recipientId?: string }) =>
      db.initiateReturn(id, recipientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.incoming })
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.count })
    },
  })
  return {
    initiateReturn: (id: string, recipientId?: string) =>
      mutation.mutateAsync({ id, recipientId }),
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useConfirmHandoff() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (id: string) => db.confirmHandoff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.incoming })
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.count })
    },
  })
  return {
    confirmHandoff: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useForceReturn() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (id: string) => db.forceReturnItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.incoming })
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.count })
    }
  })
  return {
    forceReturn: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useActiveItems() {
  const result = useQuery({
    queryKey: queryKeys.items.active,
    queryFn: db.getActiveItems,
  })
  return {
    items: result.data ?? [],
    loading: result.isLoading,
    error: result.error,
    refresh: result.refetch,
  }
}

export function usePendingHandoffs() {
  const result = useQuery({
    queryKey: queryKeys.items.pendingHandoffs,
    queryFn: db.getMyPendingHandoffs,
    staleTime: 1000 * 15, // 15s — feeds the nav badge, refresh more often
  })
  return {
    items: result.data ?? [],
    loading: result.isLoading,
    error: result.error,
    refresh: result.refetch,
  }
}

export function useOverdueItems() {
  const result = useQuery({
    queryKey: queryKeys.items.overdue,
    queryFn: db.getOverdueItems,
  })
  return {
    items: result.data ?? [],
    loading: result.isLoading,
    error: result.error,
    refresh: result.refetch,
  }
}

export function useBorrowedByMeItems() {
  const result = useQuery({
    queryKey: queryKeys.items.borrowedByMe,
    queryFn: db.getBorrowedByMeItems,
  })
  return {
    items: result.data ?? [],
    loading: result.isLoading,
    error: result.error,
    refresh: result.refetch,
  }
}

// Re-export queryKeys so screens can invalidate without importing lib/query-client
export { queryKeys }
