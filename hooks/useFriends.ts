/**
 * useFriends Hook
 *
 * React hooks for managing friends data
 */

import { useState, useEffect, useCallback } from 'react'
import type { Friend, FriendFilters } from 'lib/types'
import * as db from 'lib/database'

export function useFriends(filters?: FriendFilters) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadFriends = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await db.queryFriends(filters)
      setFriends(data)
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
        const data = await db.getFriendById(id)
        setFriend(data)
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

  const createFriend = useCallback(async (friendData: Parameters<typeof db.createFriend>[0]) => {
    try {
      setLoading(true)
      setError(null)
      const newFriend = await db.createFriend(friendData)
      return newFriend
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
      const updatedFriend = await db.updateFriend(id, updates)
      return updatedFriend
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
      const success = await db.deleteFriend(id)
      return success
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
        const data = await db.getItemsByFriend(friendId)
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
