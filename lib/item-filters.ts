/**
 * Category filter and sort for item lists (My Library, Borrowed, a friend's library, Explore).
 * Pure: no React Native or Supabase.
 */
import type { ItemCategory } from './types';

export type ItemSort = 'recent' | 'az' | 'due';

/** Short labels for the sort button; SORT_LABELS are the menu wording. */
export const SORT_SHORT: Record<ItemSort, string> = {
  recent: 'Newest',
  az: 'A–Z',
  due: 'Due soon',
};

export const SORT_LABELS: Record<ItemSort, string> = {
  recent: 'Recently added',
  az: 'A–Z',
  due: 'Due back soonest',
};

/** The order categories appear in (matches the add-item picker). */
export const CATEGORY_ORDER: ItemCategory[] = [
  'book',
  'tool',
  'clothing',
  'electronics',
  'game',
  'sports',
  'kitchen',
  'camping',
  'other',
];

interface Filterable {
  name: string;
  category: ItemCategory;
  createdAt: Date;
  dueDate?: Date;
}

/** The categories present in `items`, in display order, with how many of each. */
export function categoryCounts(items: Pick<Filterable, 'category'>[]) {
  const counts = new Map<ItemCategory, number>();
  for (const i of items) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  return CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => ({
    category: c,
    count: counts.get(c) as number,
  }));
}

/** Which sorts make sense for these items: "due back soonest" only when something is due. */
export function sortOptions(items: Pick<Filterable, 'dueDate'>[]): ItemSort[] {
  return items.some((i) => i.dueDate) ? ['recent', 'az', 'due'] : ['recent', 'az'];
}

const byName = (a: Filterable, b: Filterable) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });

/**
 * Keeps one category (or all, when `category` is null) and sorts. "Due" puts the soonest due
 * first and anything with no due date last (newest first among those).
 */
export function applyItemFilters<T extends Filterable>(
  items: T[],
  { category, sort }: { category: ItemCategory | null; sort: ItemSort }
): T[] {
  const kept = category ? items.filter((i) => i.category === category) : [...items];
  const recent = (a: T, b: T) => b.createdAt.getTime() - a.createdAt.getTime();
  if (sort === 'az') return kept.sort((a, b) => byName(a, b) || recent(a, b));
  if (sort === 'due') {
    return kept.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime() || byName(a, b);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return recent(a, b);
    });
  }
  return kept.sort((a, b) => recent(a, b) || byName(a, b));
}

/** A category the list no longer has falls back to "All"; a sort it can't offer falls back too. */
export function validFilters(
  items: Filterable[],
  { category, sort }: { category: ItemCategory | null; sort: ItemSort }
): { category: ItemCategory | null; sort: ItemSort } {
  const cats = categoryCounts(items).map((c) => c.category);
  return {
    category: category && cats.includes(category) ? category : null,
    sort: sortOptions(items).includes(sort) ? sort : 'recent',
  };
}
