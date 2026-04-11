import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Item, ItemFilters } from 'lib/types'
import * as db from 'lib/database-supabase'
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

export function useMarkItemReturned() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (id: string) => db.markItemReturned(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.incoming })
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.count })
    },
  })
  return {
    markReturned: mutation.mutateAsync,
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
