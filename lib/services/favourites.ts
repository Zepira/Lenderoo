/**
 * Service for per-user item favourites (heart icon).
 *
 * Favouriting is scoped to the viewer, not the item — a friend's item shown
 * in Explore can be favourited independently by each person who sees it.
 */

import { supabase } from '../supabase'
import { queryClient, queryKeys } from '../query-client'

/**
 * Get the current user's favourited item IDs across a batch of items
 * (e.g. all items shown in a grid). One query instead of N.
 */
export async function getMyFavouriteItemIds(
  itemIds: string[]
): Promise<Set<string>> {
  const set = new Set<string>()
  if (itemIds.length === 0) return set

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return set

  const { data, error } = await supabase
    .from('item_favourites')
    .select('item_id')
    .in('item_id', itemIds)
    .eq('user_id', user.id)

  if (error || !data) return set

  for (const row of data) set.add(row.item_id)
  return set
}

/**
 * Get whether the current user has favourited a single item.
 */
export async function isItemFavourited(itemId: string): Promise<boolean> {
  const set = await getMyFavouriteItemIds([itemId])
  return set.has(itemId)
}

/**
 * Set the current user's favourite status for an item (insert or delete).
 */
export async function setItemFavourite(
  itemId: string,
  favourite: boolean
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (favourite) {
    const { error } = await supabase
      .from('item_favourites')
      .insert({ item_id: itemId, user_id: user.id })
    if (error && error.code !== '23505') {
      throw new Error(`Failed to favourite item: ${error.message}`)
    }
  } else {
    const { error } = await supabase
      .from('item_favourites')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', user.id)
    if (error) throw new Error(`Failed to unfavourite item: ${error.message}`)
  }
  // Saved (Library tab, Home row) reads item_favourites, so refresh it after any heart tap.
  queryClient.invalidateQueries({ queryKey: queryKeys.saved })
}

// ── Saved (migration 052) ────────────────────────────────────────────────────

export interface SavedEntry {
  itemId: string
  /** Tell me when it's free to borrow again. */
  notify: boolean
  savedAt: Date
}

/**
 * Everything the current user has saved, newest first. Item rows are loaded separately
 * (useItemsByIds), so an item that's been deleted, unfriended or hidden from them simply drops
 * out of the list.
 */
export async function getSavedEntries(): Promise<SavedEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('item_favourites')
    .select('item_id, notify, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Couldn't load your saved items: ${error.message}`)
  return (data ?? []).map((r: { item_id: string; notify: boolean | null; created_at: string }) => ({
    itemId: r.item_id,
    notify: r.notify ?? true,
    savedAt: new Date(r.created_at),
  }))
}

/** Turns the "tell me when it's free" alert on or off for one saved item. */
export async function setSavedNotify(itemId: string, notify: boolean): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('item_favourites')
    .update({ notify })
    .eq('item_id', itemId)
    .eq('user_id', user.id)
  if (error) throw new Error(`Couldn't change the alert: ${error.message}`)
}
