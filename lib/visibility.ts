/**
 * Friend groups and who can see an item (migration 051). Pure: no React Native or Supabase.
 * The database enforces the rule (public.item_visible_to); this mirrors it for labels and tests.
 */
import type { FriendGroup, ItemAudience, ItemVisibility } from './types';

export const EVERYONE: ItemAudience = { visibility: 'all', groupIds: [] };

/** Offered when making a group; people can type any name instead. */
export const SUGGESTED_GROUP_NAMES = [
  'Close friends',
  'Family',
  'Work friends',
  'Neighbours',
  'Book club',
] as const;

export const VISIBILITY_OPTIONS: { key: ItemVisibility; label: string }[] = [
  { key: 'all', label: 'All friends' },
  { key: 'only', label: 'Only' },
  { key: 'except', label: 'All except' },
];

export const MAX_GROUP_NAME = 40;

/** Drops groups that no longer exist; a rule left with no groups is reported as `empty`. */
export function cleanAudience(
  audience: ItemAudience | null | undefined,
  groups: FriendGroup[]
): ItemAudience & { empty: boolean } {
  if (!audience || audience.visibility === 'all') return { ...EVERYONE, empty: false };
  const known = new Set(groups.map((g) => g.id));
  const groupIds = [...new Set(audience.groupIds)].filter((id) => known.has(id));
  return { visibility: audience.visibility, groupIds, empty: groupIds.length === 0 };
}

/**
 * What to save. 'only' with no groups means nobody but you; 'except' with none means every
 * friend, so it's saved as 'all'.
 */
export function audienceToSave(audience: ItemAudience, groups: FriendGroup[]): ItemAudience {
  const clean = cleanAudience(audience, groups);
  if (clean.visibility === 'except' && clean.empty) return EVERYONE;
  return { visibility: clean.visibility, groupIds: clean.groupIds };
}

const list = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** "All friends", "Only Close friends and Family", "All friends except Work friends". */
export function audienceLabel(audience: ItemAudience | null | undefined, groups: FriendGroup[]) {
  const clean = cleanAudience(audience, groups);
  if (clean.visibility === 'all') return 'All friends';
  const names = clean.groupIds.map((id) => groups.find((g) => g.id === id)?.name ?? '');
  if (clean.visibility === 'only') return clean.empty ? 'Only you' : `Only ${list(names)}`;
  return clean.empty ? 'All friends' : `All friends except ${list(names)}`;
}

/** Whether a friend in `memberOf` (group ids) would see an item with this rule. */
export function canSee(audience: ItemAudience | null | undefined, memberOf: string[]): boolean {
  if (!audience || audience.visibility === 'all') return true;
  const inAny = audience.groupIds.some((id) => memberOf.includes(id));
  return audience.visibility === 'only' ? inAny : !inAny;
}

/** How many friends an item reaches, out of `friendIds`. */
export function reach(
  audience: ItemAudience | null | undefined,
  groups: FriendGroup[],
  friendIds: string[]
): number {
  return friendIds.filter((f) =>
    canSee(
      audience,
      groups.filter((g) => g.memberIds.includes(f)).map((g) => g.id)
    )
  ).length;
}

/** An error to show for a new or renamed group's name, or null if it's fine. */
export function groupNameError(
  name: string,
  groups: FriendGroup[],
  renaming?: string
): string | null {
  const n = name.trim();
  if (!n) return 'Give the group a name.';
  if (n.length > MAX_GROUP_NAME) return `Keep it to ${MAX_GROUP_NAME} characters.`;
  if (groups.some((g) => g.id !== renaming && g.name.trim().toLowerCase() === n.toLowerCase())) {
    return 'You already have a group with that name.';
  }
  return null;
}

/** Suggested names you don't already use. */
export function unusedSuggestions(groups: FriendGroup[]): string[] {
  const used = new Set(groups.map((g) => g.name.trim().toLowerCase()));
  return SUGGESTED_GROUP_NAMES.filter((n) => !used.has(n.toLowerCase()));
}
