/**
 * Service for item availability notification subscriptions
 *
 * Lets a friend ask to be notified when an owner-marked-unavailable
 * item becomes available again.
 */

import { supabase } from '../supabase';
import type { ItemAvailabilitySubscription } from '../types';

function convertSubscriptionFromDb(row: any): ItemAvailabilitySubscription {
  return {
    id: row.id,
    itemId: row.item_id,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    notifiedAt: row.notified_at ? new Date(row.notified_at) : undefined,
  };
}

/**
 * Subscribe the current user to be notified when an item becomes available.
 * Safe to call when already subscribed — returns the existing subscription.
 */
export async function subscribeToItemAvailability(
  itemId: string
): Promise<ItemAvailabilitySubscription> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('item_availability_subscriptions')
    .insert({ item_id: itemId, user_id: user.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const existing = await getMyAvailabilitySubscriptionForItem(itemId);
      if (existing) return existing;
    }
    throw new Error(`Failed to subscribe: ${error.message}`);
  }

  return convertSubscriptionFromDb(data);
}

/**
 * Cancel a pending availability subscription.
 */
export async function unsubscribeFromItemAvailability(
  subscriptionId: string
): Promise<void> {
  const { error } = await supabase
    .from('item_availability_subscriptions')
    .delete()
    .eq('id', subscriptionId);

  if (error) throw new Error(`Failed to unsubscribe: ${error.message}`);
}

/**
 * Get the current user's active (not-yet-notified) subscription for an item.
 */
export async function getMyAvailabilitySubscriptionForItem(
  itemId: string
): Promise<ItemAvailabilitySubscription | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('item_availability_subscriptions')
    .select('*')
    .eq('item_id', itemId)
    .eq('user_id', user.id)
    .is('notified_at', null)
    .maybeSingle();

  if (error || !data) return null;

  return convertSubscriptionFromDb(data);
}

/**
 * Get the current user's active subscriptions across a batch of items
 * (e.g. all items shown in a grid), keyed by item ID. One query instead
 * of N — use this over calling getMyAvailabilitySubscriptionForItem in a loop.
 */
export async function getMyAvailabilitySubscriptionsForItems(
  itemIds: string[]
): Promise<Map<string, ItemAvailabilitySubscription>> {
  const map = new Map<string, ItemAvailabilitySubscription>();
  if (itemIds.length === 0) return map;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return map;

  const { data, error } = await supabase
    .from('item_availability_subscriptions')
    .select('*')
    .in('item_id', itemIds)
    .eq('user_id', user.id)
    .is('notified_at', null);

  if (error || !data) return map;

  for (const row of data) {
    const sub = convertSubscriptionFromDb(row);
    map.set(sub.itemId, sub);
  }
  return map;
}
