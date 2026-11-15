/**
 * Friend groups and who can see each item (migration 051).
 *
 * Everything here is the owner's own data: RLS only ever returns your own groups, members and
 * item rules. Friends never see any of it; items hidden from them simply don't come back.
 */
import { supabase } from '../supabase';
import type { FriendGroup, ItemAudience, ItemVisibility } from '../types';
import { EVERYONE } from '../visibility';

async function me(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

const fail = (what: string, error: { message: string; code?: string }): never => {
  if (error.code === '23505') throw new Error('You already have a group with that name.');
  throw new Error(`Couldn't ${what}: ${error.message}`);
};

// ── Groups ───────────────────────────────────────────────────────────────────

export async function getFriendGroups(): Promise<FriendGroup[]> {
  const { data, error } = await supabase
    .from('friend_groups')
    .select('id, name, friend_group_members(friend_id)')
    .order('name');
  if (error) fail('load your groups', error);
  return (data ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    memberIds: (g.friend_group_members ?? []).map((m: { friend_id: string }) => m.friend_id),
  }));
}

export async function createFriendGroup(name: string, memberIds: string[] = []): Promise<FriendGroup> {
  const owner = await me();
  const { data, error } = await supabase
    .from('friend_groups')
    .insert({ owner_id: owner, name: name.trim() })
    .select('id, name')
    .single();
  if (error || !data) return fail('make the group', error ?? { message: 'no row' });
  if (memberIds.length) await setGroupMembers(data.id, memberIds, []);
  return { id: data.id, name: data.name, memberIds };
}

export async function renameFriendGroup(groupId: string, name: string): Promise<void> {
  const { error } = await supabase.from('friend_groups').update({ name: name.trim() }).eq('id', groupId);
  if (error) fail('rename the group', error);
}

/** Deletes a group; the database takes it out of item rules and your default. */
export async function deleteFriendGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('friend_groups').delete().eq('id', groupId);
  if (error) fail('delete the group', error);
}

/** Makes a group's members exactly `next` (given who's in it now). */
export async function setGroupMembers(groupId: string, next: string[], current: string[]): Promise<void> {
  const add = next.filter((id) => !current.includes(id));
  const remove = current.filter((id) => !next.includes(id));
  if (add.length) {
    const { error } = await supabase
      .from('friend_group_members')
      .insert(add.map((friend_id) => ({ group_id: groupId, friend_id })));
    if (error) fail('add them to the group', error);
  }
  if (remove.length) {
    const { error } = await supabase
      .from('friend_group_members')
      .delete()
      .eq('group_id', groupId)
      .in('friend_id', remove);
    if (error) fail('take them out of the group', error);
  }
}

/** Puts one friend in exactly the groups `groupIds`, out of all your `groups`. */
export async function setFriendGroups(
  friendId: string,
  groupIds: string[],
  groups: FriendGroup[]
): Promise<void> {
  for (const g of groups) {
    const isIn = g.memberIds.includes(friendId);
    const wantIn = groupIds.includes(g.id);
    if (isIn !== wantIn) {
      await setGroupMembers(
        g.id,
        wantIn ? [...g.memberIds, friendId] : g.memberIds.filter((id) => id !== friendId),
        g.memberIds
      );
    }
  }
}

// ── Item rules ───────────────────────────────────────────────────────────────

/** An item's rule (all friends when it has none). Owner only. */
export async function getItemAudience(itemId: string): Promise<ItemAudience> {
  const { data, error } = await supabase
    .from('item_audience')
    .select('visibility, group_ids')
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) fail("load who can see this item", error);
  return data ? { visibility: data.visibility as ItemVisibility, groupIds: data.group_ids ?? [] } : EVERYONE;
}

/** Rules for all your items at once, keyed by item id (items with none are all friends). */
export async function getItemAudiences(): Promise<Record<string, ItemAudience>> {
  const { data, error } = await supabase.from('item_audience').select('item_id, visibility, group_ids');
  if (error) fail('load who can see your items', error);
  return Object.fromEntries(
    (data ?? []).map((r: any) => [r.item_id, { visibility: r.visibility, groupIds: r.group_ids ?? [] }])
  );
}

/** Saves an item's rule; 'all' removes the row (so no row always means all friends). */
export async function setItemAudience(itemId: string, audience: ItemAudience): Promise<void> {
  if (audience.visibility === 'all') {
    const { error } = await supabase.from('item_audience').delete().eq('item_id', itemId);
    if (error) fail('save who can see this item', error);
    return;
  }
  const { error } = await supabase
    .from('item_audience')
    .upsert({ item_id: itemId, visibility: audience.visibility, group_ids: audience.groupIds });
  if (error) fail('save who can see this item', error);
}

// ── Your default for new items ───────────────────────────────────────────────

export async function getDefaultAudience(): Promise<ItemAudience> {
  const id = await me();
  const { data, error } = await supabase
    .from('users')
    .select('default_visibility, default_visibility_groups')
    .eq('id', id)
    .single();
  if (error) return EVERYONE; // an older database without migration 051
  return {
    visibility: (data.default_visibility ?? 'all') as ItemVisibility,
    groupIds: data.default_visibility_groups ?? [],
  };
}

export async function setDefaultAudience(audience: ItemAudience): Promise<void> {
  const id = await me();
  const { error } = await supabase
    .from('users')
    .update({
      default_visibility: audience.visibility,
      default_visibility_groups: audience.visibility === 'all' ? [] : audience.groupIds,
    })
    .eq('id', id);
  if (error) fail('save your default', error);
}
