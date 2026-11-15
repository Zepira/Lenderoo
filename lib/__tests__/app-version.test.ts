import { describe, expect, it, jest } from '@jest/globals';
import { RECORD_EVERY_MS, shouldRecord } from '../services/app-version';

jest.mock('../supabase', () => ({ supabase: {} }));

describe('shouldRecord', () => {
  it('records the first time, for a different user, and after 30 minutes', () => {
    expect(shouldRecord(null, 'a', 0)).toBe(true);
    expect(shouldRecord({ userId: 'a', at: 0 }, 'a', RECORD_EVERY_MS - 1)).toBe(false);
    expect(shouldRecord({ userId: 'a', at: 0 }, 'a', RECORD_EVERY_MS)).toBe(true);
    expect(shouldRecord({ userId: 'a', at: 0 }, 'b', 1)).toBe(true);
  });
});
