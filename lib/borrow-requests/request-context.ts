/**
 * What an owner needs to decide on an incoming borrow request: whether the item is lent out to
 * someone else right now, and when the request came in relative to others for the same item.
 * Pure: no React Native or Supabase.
 */
import { format, isSameDay, subDays } from 'date-fns';

export interface RequestLike {
  id: string;
  itemId: string;
  requesterId: string;
  createdAt: Date;
  itemBorrowedBy?: string;
}

/** Lent out to someone other than the person asking (approving then queues them). */
export function isLentToSomeoneElse(r: Pick<RequestLike, 'requesterId' | 'itemBorrowedBy'>) {
  return !!r.itemBorrowedBy && r.itemBorrowedBy !== r.requesterId;
}

/**
 * For each request, its place among the pending requests for the same item, earliest first.
 * Only requests that share their item with another appear in the map.
 */
export function requestOrder(requests: RequestLike[]): Map<string, { position: number; of: number }> {
  const byItem = new Map<string, RequestLike[]>();
  for (const r of requests) byItem.set(r.itemId, [...(byItem.get(r.itemId) ?? []), r]);
  const out = new Map<string, { position: number; of: number }>();
  for (const group of byItem.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
    );
    sorted.forEach((r, i) => out.set(r.id, { position: i + 1, of: sorted.length }));
  }
  return out;
}

const ORDINALS = ['1st', '2nd', '3rd'];
export const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`;

/** "Today, 2:41 pm", "Yesterday, 9:05 am", "Mon 12 Nov, 4:30 pm" (year added if not this year). */
export function requestedAt(date: Date, now: Date = new Date()): string {
  const time = format(date, 'h:mm aaa');
  if (isSameDay(date, now)) return `Today, ${time}`;
  if (isSameDay(date, subDays(now, 1))) return `Yesterday, ${time}`;
  const day = date.getFullYear() === now.getFullYear() ? 'EEE d MMM' : 'EEE d MMM yyyy';
  return `${format(date, day)}, ${time}`;
}

/** "Lent to Sam · due back 3 Dec" (or "Lent to someone else" when the name isn't known). */
export function lentLabel(
  r: { itemBorrowerName?: string; itemDueDate?: Date },
  now: Date = new Date()
): string {
  const who = r.itemBorrowerName ? `Lent to ${r.itemBorrowerName}` : 'Lent to someone else';
  if (!r.itemDueDate) return who;
  const fmt = r.itemDueDate.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM yyyy';
  const late = r.itemDueDate.getTime() < now.getTime();
  return `${who} · ${late ? 'was due' : 'due back'} ${format(r.itemDueDate, fmt)}`;
}
