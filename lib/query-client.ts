import { QueryClient } from '@tanstack/react-query'
import type { ItemFilters } from 'lib/types'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // 30s — data is fresh, won't refetch on focus
      gcTime: 1000 * 60 * 5,      // 5 min — keep unused data in cache
      retry: 2,
      refetchOnWindowFocus: true,  // Refresh when app comes back to foreground
    },
  },
})

// Centralised query keys — keeps invalidation calls consistent across hooks/screens
export const queryKeys = {
  items: {
    all: ['items'] as const,
    filtered: (filters?: ItemFilters) => ['items', 'filtered', filters] as const,
    detail: (id: string) => ['items', 'detail', id] as const,
    active: ['items', 'active'] as const,
    overdue: ['items', 'overdue'] as const,
    borrowedByMe: ['items', 'borrowed-by-me'] as const,
  },
  friends: {
    all: ['friends'] as const,
    detail: (id: string) => ['friends', 'detail', id] as const,
    items: (friendId: string) => ['friends', 'items', friendId] as const,
  },
  borrowRequests: {
    incoming: ['borrow-requests', 'incoming'] as const,
    outgoing: ['borrow-requests', 'outgoing'] as const,
    count: ['borrow-requests', 'count'] as const,
    forItem: (itemId: string) => ['borrow-requests', 'item', itemId] as const,
  },
}
