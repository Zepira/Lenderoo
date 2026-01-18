/**
 * useItems Hook
 *
 * React hooks for managing items data
 */

import { useState, useEffect, useCallback } from 'react'
import type { Item, ItemFilters } from 'lib/types'
import * as db from 'lib/database'

export function useItems(filters?: ItemFilters) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await db.queryItems(filters)
      setItems(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const refresh = useCallback(() => {
    return loadItems()
  }, [loadItems])

  return { items, loading, error, refresh }
}

export function useItem(id: string | null) {
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) {
      setItem(null)
      setLoading(false)
      return
    }

    const loadItem = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await db.getItemById(id)
        setItem(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    loadItem()
  }, [id])

  return { item, loading, error }
}

export function useCreateItem() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createItem = useCallback(async (itemData: Parameters<typeof db.createItem>[0]) => {
    try {
      setLoading(true)
      setError(null)
      const newItem = await db.createItem(itemData)
      return newItem
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { createItem, loading, error }
}

export function useUpdateItem() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateItem = useCallback(async (id: string, updates: Partial<Item>) => {
    try {
      setLoading(true)
      setError(null)
      const updatedItem = await db.updateItem(id, updates)
      return updatedItem
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateItem, loading, error }
}

export function useDeleteItem() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteItem = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const success = await db.deleteItem(id)
      return success
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { deleteItem, loading, error }
}

export function useMarkItemReturned() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const markReturned = useCallback(async (id: string, returnedDate?: Date) => {
    try {
      setLoading(true)
      setError(null)
      const updatedItem = await db.markItemReturned(id, returnedDate)
      return updatedItem
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { markReturned, loading, error }
}

export function useActiveItems() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await db.getActiveItems()
      setItems(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const refresh = useCallback(() => {
    return loadItems()
  }, [loadItems])

  return { items, loading, error, refresh }
}

export function useOverdueItems() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await db.getOverdueItems()
      setItems(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const refresh = useCallback(() => {
    return loadItems()
  }, [loadItems])

  return { items, loading, error, refresh }
}
