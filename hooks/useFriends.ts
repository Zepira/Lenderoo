import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Friend, FriendFilters } from 'lib/types'
import {
  getMyFriends,
  getFriendUserById,
  getUserPublicProfile,
  addFriendByCode,
  removeFriend,
  getItemsBorrowedByFriend,
  type FriendUser,
  type UserPublicProfile,
} from '@/lib/services/friends'
import { queryKeys } from 'lib/query-client'

function convertFriendUserToFriend(friendUser: FriendUser): Friend {
  return {
    id: friendUser.id,
    userId: '',
    name: friendUser.name,
    email: friendUser.email,
    avatarUrl: friendUser.avatarUrl,
    totalItemsBorrowed: 0,
    currentItemsBorrowed: 0,
    createdAt: friendUser.friendsSince,
    updatedAt: friendUser.friendsSince,
  }
}

export function useFriends(filters?: FriendFilters) {
  const result = useQuery({
    queryKey: queryKeys.friends.all,
    queryFn: async () => {
      const data = await getMyFriends()
      return data.map(convertFriendUserToFriend)
    },
  })

  // Search filter is applied client-side so the base list stays cached
  const friends = useMemo(() => {
    const list = result.data ?? []
    if (!filters?.searchQuery) return list
    const q = filters.searchQuery.toLowerCase()
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q),
    )
  }, [result.data, filters?.searchQuery])

  return {
    friends,
    loading: result.isLoading,
    error: result.error,
    refresh: result.refetch,
  }
}

export function useFriend(id: string | null) {
  const result = useQuery({
    queryKey: queryKeys.friends.detail(id ?? ''),
    queryFn: async () => {
      const data = await getFriendUserById(id!)
      return data ? convertFriendUserToFriend(data) : null
    },
    enabled: !!id,
  })
  return {
    friend: result.data ?? null,
    loading: result.isLoading,
    error: result.error,
  }
}

export function useCreateFriend() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (friendCode: string) => {
      const result = await addFriendByCode(friendCode)
      if (!result.success) throw new Error(result.message)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.all })
    },
  })
  return {
    createFriend: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useUpdateFriend() {
  // Friend updates are not supported — users manage their own profiles
  return {
    updateFriend: async (_id: string, _updates: Partial<Friend>) => null,
    loading: false,
    error: null,
  }
}

export function useDeleteFriend() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (id: string) => removeFriend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.all })
    },
  })
  return {
    deleteFriend: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  }
}

export function useUserProfile(id: string | null) {
  const result = useQuery({
    queryKey: ['user-profile', id ?? ''],
    queryFn: () => getUserPublicProfile(id!),
    enabled: !!id,
  })
  return {
    profile: result.data ?? null,
    loading: result.isLoading,
  }
}

export function useFriendItems(friendId: string | null) {
  const result = useQuery({
    queryKey: queryKeys.friends.items(friendId ?? ''),
    queryFn: () => getItemsBorrowedByFriend(friendId!),
    enabled: !!friendId,
  })
  return {
    items: result.data ?? [],
    loading: result.isLoading,
    error: result.error,
  }
}
