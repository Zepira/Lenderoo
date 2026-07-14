/**
 * Service for per-user item favourites (heart icon).
 *
 * Favouriting is scoped to the viewer, not the item — a friend's item shown
 * in Explore can be favourited independently by each person who sees it.
 */

import { supabase } from '../supabase'

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
}
