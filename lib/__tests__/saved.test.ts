import { describe, expect, it } from '@jest/globals';
import { isFree, possessive, savedStatus, sortSaved } from '../saved';

const now = new Date('2026-11-15T12:00:00');
const d = (s: string) => new Date(s);

describe('isFree / savedStatus', () => {
  it('describes each state', () => {
    expect(isFree({})).toBe(true);
    expect(savedStatus({}, now)).toBe('Free to borrow');
    expect(savedStatus({ isUnavailable: true }, now)).toBe('Not lending it right now');
    expect(savedStatus({ borrowedBy: 'x' }, now)).toBe('Lent out');
    expect(savedStatus({ borrowedBy: 'x', dueDate: d('2026-12-03') }, now)).toBe('Lent out · back 3 Dec');
    expect(savedStatus({ borrowedBy: 'x', dueDate: d('2027-01-04') }, now)).toBe('Lent out · back 4 Jan 2027');
    expect(savedStatus({ borrowedBy: 'x', dueDate: d('2026-11-10') }, now)).toBe('Lent out · overdue');
    expect(savedStatus({ pendingRecipientId: 'y' }, now)).toBe('Being handed over');
    expect(isFree({ borrowedBy: 'x', returnedDate: d('2026-11-01') })).toBe(true);
  });
});

describe('possessive', () => {
  it("uses the first name", () => {
    expect(possessive('Mei Chen')).toBe("Mei's");
    expect(possessive('James Lee')).toBe("James'");
    expect(possessive(undefined)).toBe("A friend's");
  });
});

describe('sortSaved', () => {
  it('puts free things first, then soonest back, then the rest', () => {
    const items = [
      { id: 'later', borrowedBy: 'x', dueDate: d('2026-12-20'), savedAt: d('2026-11-01') },
      { id: 'off', isUnavailable: true, savedAt: d('2026-11-14') },
      { id: 'freeOld', savedAt: d('2026-10-01') },
      { id: 'soon', borrowedBy: 'x', dueDate: d('2026-11-20'), savedAt: d('2026-11-02') },
      { id: 'freeNew', savedAt: d('2026-11-10') },
      { id: 'open', borrowedBy: 'x', savedAt: d('2026-11-13') },
    ];
    expect(sortSaved(items).map((i) => i.id)).toEqual(['freeNew', 'freeOld', 'soon', 'later', 'open', 'off']);
  });
});
