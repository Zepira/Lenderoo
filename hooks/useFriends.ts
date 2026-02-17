/**
 * useFriends Hook
 *
 * React hooks for managing friends data
 */

import { useState, useEffect, useCallback } from 'react'
import type { Friend, FriendFilters } from 'lib/types'
import { getMyFriends, type FriendUser } from 'lib/friends-service'

// Convert FriendUser to Friend for backward compatibility
function convertFriendUserToFriend(friendUser: FriendUser): Friend {
  return {
    id: friendUser.id,
    userId: '', // Not applicable for user-to-user friends
    name: friendUser.name,
    email: friendUser.email,
    avatarUrl: friendUser.avatarUrl,
    totalItemsBorrowed: 0, // Not tracked in new system
    currentItemsBorrowed: 0, // Not tracked in new system
    createdAt: friendUser.friendsSince,
    updatedAt: friendUser.friendsSince,
  }
}

export function useFriends(filters?: FriendFilters) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadFriends = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getMyFriends()
      let friendsList = data.map(convertFriendUserToFriend)

      // Apply client-side search filter if needed
      if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        friendsList = friendsList.filter(
          (friend) =>
            friend.name.toLowerCase().includes(query) ||
            friend.email?.toLowerCase().includes(query)
        )
      }

      setFriends(friendsList)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  const refresh = useCallback(() => {
    return loadFriends()
  }, [loadFriends])

  return { friends, loading, error, refresh }
}

export function useFriend(id: string | null) {
  const [friend, setFriend] = useState<Friend | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) {
      setFriend(null)
      setLoading(false)
      return
    }

    const loadFriend = async () => {
      try {
        setLoading(true)
        setError(null)
        const { getFriendUserById } = await import('lib/friends-service')
        const data = await getFriendUserById(id)
        setFriend(data ? convertFriendUserToFriend(data) : null)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    loadFriend()
  }, [id])

  return { friend, loading, error }
}

export function useCreateFriend() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createFriend = useCallback(async (friendCode: string) => {
    try {
      setLoading(true)
      setError(null)
      const { addFriendByCode } = await import('lib/friends-service')
      const result = await addFriendByCode(friendCode)
      if (!result.success) {
        throw new Error(result.message)
      }
      return result
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { createFriend, loading, error }
}

export function useUpdateFriend() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateFriend = useCallback(async (id: string, updates: Partial<Friend>) => {
    try {
      setLoading(true)
      setError(null)
      // Friend updates are not supported in the new system
      // Users manage their own profiles
      console.warn('Friend updates are not supported in the new system')
      return null
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateFriend, loading, error }
}

export function useDeleteFriend() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteFriend = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const { removeFriend } = await import('lib/friends-service')
      await removeFriend(id)
      return true
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { deleteFriend, loading, error }
}

export function useFriendItems(friendId: string | null) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!friendId) {
      setItems([])
      setLoading(false)
      return
    }

    const loadItems = async () => {
      try {
        setLoading(true)
        setError(null)
        const { getItemsBorrowedByFriend } = await import('lib/friends-service')
        const data = await getItemsBorrowedByFriend(friendId)
        setItems(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [friendId])

  return { items, loading, error }
}
