import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Item } from 'lib/types'
import { getSavedEntries, setItemFavourite, setSavedNotify, type SavedEntry } from '@/lib/services/favourites'
import { queryKeys } from 'lib/query-client'
import { sortSaved } from 'lib/saved'
import { useItemsByIds } from './useItems'

export type SavedItem = Item & { savedAt: Date; notify: boolean; isFavourite: true }

/**
 * Your saved items (friends' things you hearted), with their live item rows, best first: free to
 * borrow, then soonest back. Items you can no longer see (deleted, unfriended, hidden) drop out.
 */
export function useSaved() {
  const qc = useQueryClient()
  const entriesQuery = useQuery({ queryKey: queryKeys.saved, queryFn: getSavedEntries })
  const entries = entriesQuery.data ?? []
  const { items, loading: itemsLoading } = useItemsByIds(entries.map((e) => e.itemId))

  const saved = useMemo(() => {
    const byId = new Map(entries.map((e) => [e.itemId, e]))
    return sortSaved(
      items
        .filter((i) => byId.has(i.id))
        .map((i) => {
          const e = byId.get(i.id) as SavedEntry
          return { ...i, savedAt: e.savedAt, notify: e.notify, isFavourite: true as const }
        })
    )
  }, [entries, items])

  const patch = (fn: (list: SavedEntry[]) => SavedEntry[]) =>
    qc.setQueryData<SavedEntry[]>(queryKeys.saved, (old) => fn(old ?? []))

  /** Un-heart: drops off the list straight away, back if it fails. */
  const unsave = useCallback(
    async (itemId: string) => {
      const before = qc.getQueryData<SavedEntry[]>(queryKeys.saved)
      patch((list) => list.filter((e) => e.itemId !== itemId))
      try {
        await setItemFavourite(itemId, false)
      } catch (e) {
        qc.setQueryData(queryKeys.saved, before)
        throw e
      }
    },
    [qc]
  )

  const setNotify = useCallback(
    async (itemId: string, notify: boolean) => {
      patch((list) => list.map((e) => (e.itemId === itemId ? { ...e, notify } : e)))
      try {
        await setSavedNotify(itemId, notify)
      } catch (e) {
        patch((list) => list.map((x) => (x.itemId === itemId ? { ...x, notify: !notify } : x)))
        throw e
      }
    },
    [qc]
  )

  return {
    saved,
    loading: entriesQuery.isLoading || (entries.length > 0 && itemsLoading && items.length === 0),
    refresh: entriesQuery.refetch,
    unsave,
    setNotify,
  }
}

/** Call after hearting or un-hearting anywhere, so the Saved list and Home row catch up. */
export function useInvalidateSaved() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.saved })
}
