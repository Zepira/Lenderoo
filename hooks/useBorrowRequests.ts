import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getIncomingBorrowRequests,
  getOutgoingBorrowRequests,
  getBorrowRequestsForItem,
  getIncomingRequestCount,
  approveBorrowRequest,
  denyBorrowRequest,
  cancelBorrowRequest,
  createBorrowRequest,
} from 'lib/borrow-requests-service'
import { queryKeys } from 'lib/query-client'

export function useIncomingBorrowRequests() {
  const result = useQuery({
    queryKey: queryKeys.borrowRequests.incoming,
    queryFn: getIncomingBorrowRequests,
  })
  return {
    requests: result.data ?? [],
    loading: result.isLoading,
    error: result.error,
    refresh: result.refetch,
  }
}

export function useOutgoingBorrowRequests() {
  const result = useQuery({
    queryKey: queryKeys.borrowRequests.outgoing,
    queryFn: getOutgoingBorrowRequests,
  })
  return {
    requests: result.data ?? [],
    loading: result.isLoading,
    error: result.error,
    refresh: result.refetch,
  }
}

export function useBorrowRequestsForItem(itemId: string | null) {
  const result = useQuery({
    queryKey: queryKeys.borrowRequests.forItem(itemId ?? ''),
    queryFn: () => getBorrowRequestsForItem(itemId!),
    enabled: !!itemId,
  })
  return {
    requests: result.data ?? [],
    loading: result.isLoading,
    error: result.error,
  }
}

export function useIncomingRequestCount() {
  const result = useQuery({
    queryKey: queryKeys.borrowRequests.count,
    queryFn: getIncomingRequestCount,
    staleTime: 1000 * 15, // 15s — count shown in nav badge, refresh more often
  })
  return result.data ?? 0
}

export function useCreateBorrowRequest() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({
      itemId,
      ownerId,
      requestedDueDate,
      message,
    }: {
      itemId: string
      ownerId: string
      requestedDueDate?: Date
      message?: string
    }) => createBorrowRequest(itemId, ownerId, requestedDueDate, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.outgoing })
    },
  })
  return {
    createRequest: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useApproveBorrowRequest() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ requestId, dueDate }: { requestId: string; dueDate?: Date }) =>
      approveBorrowRequest(requestId, dueDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.incoming })
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.count })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
  return {
    approve: (requestId: string, dueDate?: Date) =>
      mutation.mutateAsync({ requestId, dueDate }),
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useDenyBorrowRequest() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (requestId: string) => denyBorrowRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.incoming })
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.count })
    },
  })
  return {
    deny: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useCancelBorrowRequest() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (requestId: string) => cancelBorrowRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowRequests.outgoing })
    },
  })
  return {
    cancel: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  }
}
