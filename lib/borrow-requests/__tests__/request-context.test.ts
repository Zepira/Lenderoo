import { describe, expect, it } from '@jest/globals';
import {
  isLentToSomeoneElse,
  lentLabel,
  ordinal,
  requestOrder,
  requestedAt,
} from '../request-context';

const at = (s: string) => new Date(s);
const req = (id: string, itemId: string, created: string, extra = {}) => ({
  id,
  itemId,
  requesterId: `u-${id}`,
  createdAt: at(created),
  ...extra,
});

describe('isLentToSomeoneElse', () => {
  it('is true only when someone other than the requester has it', () => {
    expect(isLentToSomeoneElse({ requesterId: 'a' })).toBe(false);
    expect(isLentToSomeoneElse({ requesterId: 'a', itemBorrowedBy: 'a' })).toBe(false);
    expect(isLentToSomeoneElse({ requesterId: 'a', itemBorrowedBy: 'b' })).toBe(true);
  });
});

describe('requestOrder', () => {
  it('ranks requests for the same item, earliest first, and skips lone ones', () => {
    const order = requestOrder([
      req('late', 'book', '2026-11-15T10:05:00'),
      req('solo', 'drill', '2026-11-15T09:00:00'),
      req('early', 'book', '2026-11-15T10:01:00'),
      req('mid', 'book', '2026-11-15T10:03:00'),
    ]);
    expect(order.get('early')).toEqual({ position: 1, of: 3 });
    expect(order.get('mid')).toEqual({ position: 2, of: 3 });
    expect(order.get('late')).toEqual({ position: 3, of: 3 });
    expect(order.has('solo')).toBe(false);
  });

  it('breaks an exact tie by id so the order is stable', () => {
    const order = requestOrder([
      req('b', 'book', '2026-11-15T10:00:00'),
      req('a', 'book', '2026-11-15T10:00:00'),
    ]);
    expect(order.get('a')?.position).toBe(1);
    expect(order.get('b')?.position).toBe(2);
  });
});

describe('ordinal', () => {
  it('names positions', () => {
    expect([1, 2, 3, 4, 11].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th']);
  });
});

describe('requestedAt', () => {
  const now = at('2026-11-15T15:00:00');
  it('says today, yesterday, a weekday, or a full date', () => {
    expect(requestedAt(at('2026-11-15T14:41:00'), now)).toBe('Today, 2:41 pm');
    expect(requestedAt(at('2026-11-14T09:05:00'), now)).toBe('Yesterday, 9:05 am');
    expect(requestedAt(at('2026-11-09T16:30:00'), now)).toBe('Mon 9 Nov, 4:30 pm');
    expect(requestedAt(at('2025-12-30T08:00:00'), now)).toBe('Tue 30 Dec 2025, 8:00 am');
  });
});

describe('lentLabel', () => {
  const now = at('2026-11-15T12:00:00');
  it('names the borrower and when it is due', () => {
    expect(lentLabel({ itemBorrowerName: 'Sam', itemDueDate: at('2026-12-03T00:00:00') }, now)).toBe(
      'Lent to Sam · due back 3 Dec'
    );
    expect(lentLabel({ itemBorrowerName: 'Sam', itemDueDate: at('2026-11-10T00:00:00') }, now)).toBe(
      'Lent to Sam · was due 10 Nov'
    );
    expect(lentLabel({ itemDueDate: at('2027-01-04T00:00:00') }, now)).toBe(
      'Lent to someone else · due back 4 Jan 2027'
    );
    expect(lentLabel({ itemBorrowerName: 'Sam' }, now)).toBe('Lent to Sam');
  });
});
