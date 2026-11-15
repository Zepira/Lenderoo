/**
 * Saved items (the heart, migration 052): status wording and order. Pure.
 */
import { format } from 'date-fns';

interface SavedLike {
  pendingRecipientId?: string;
  borrowedBy?: string;
  borrowedDate?: Date;
  returnedDate?: Date;
  dueDate?: Date;
  isUnavailable?: boolean;
}

/** Can you ask to borrow it right now? */
export function isFree(item: SavedLike): boolean {
  if (item.isUnavailable) return false;
  if (item.pendingRecipientId) return false;
  return !((item.borrowedBy || item.borrowedDate) && !item.returnedDate);
}

/** "Free to borrow", "Lent out · back 3 Dec", "Lent out · overdue", "Not lending it right now". */
export function savedStatus(item: SavedLike, now: Date = new Date()): string {
  if (item.isUnavailable) return 'Not lending it right now';
  if (isFree(item)) return 'Free to borrow';
  if (item.pendingRecipientId && !item.borrowedBy) return 'Being handed over';
  if (!item.dueDate) return 'Lent out';
  if (item.dueDate.getTime() < now.getTime()) return 'Lent out · overdue';
  const fmt = item.dueDate.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM yyyy';
  return `Lent out · back ${format(item.dueDate, fmt)}`;
}

/** "Mei's", "James'" — whose it is, for the card. */
export function possessive(name: string | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first) return "A friend's";
  return /s$/i.test(first) ? `${first}'` : `${first}'s`;
}

/**
 * Free to borrow first, then the soonest back, then lent with no date, then ones the owner isn't
 * lending; newest saved first within each.
 */
export function sortSaved<T extends SavedLike & { savedAt: Date }>(items: T[]): T[] {
  const rank = (i: T) =>
    i.isUnavailable ? 3 : isFree(i) ? 0 : i.dueDate ? 1 : 2;
  return [...items].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (rank(a) === 1 ? (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime() : 0) ||
      b.savedAt.getTime() - a.savedAt.getTime()
  );
}
