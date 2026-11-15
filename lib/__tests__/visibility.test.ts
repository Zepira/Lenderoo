import { describe, expect, it } from '@jest/globals';
import type { FriendGroup } from '../types';
import {
  audienceLabel,
  audienceToSave,
  canSee,
  cleanAudience,
  groupNameError,
  reach,
  unusedSuggestions,
} from '../visibility';

const groups: FriendGroup[] = [
  { id: 'close', name: 'Close friends', memberIds: ['priya', 'mei'] },
  { id: 'fam', name: 'Family', memberIds: ['mei', 'tom'] },
  { id: 'work', name: 'Work friends', memberIds: ['josh'] },
];

describe('cleanAudience', () => {
  it('treats a missing rule as all friends', () => {
    expect(cleanAudience(null, groups)).toEqual({ visibility: 'all', groupIds: [], empty: false });
    expect(cleanAudience({ visibility: 'all', groupIds: ['close'] }, groups).groupIds).toEqual([]);
  });
  it('drops deleted and repeated groups and flags an empty rule', () => {
    expect(cleanAudience({ visibility: 'only', groupIds: ['close', 'gone', 'close'] }, groups)).toEqual({
      visibility: 'only',
      groupIds: ['close'],
      empty: false,
    });
    expect(cleanAudience({ visibility: 'only', groupIds: ['gone'] }, groups).empty).toBe(true);
  });
});

describe('audienceToSave', () => {
  it("saves 'except' with no groups as all friends, but keeps 'only' with none", () => {
    expect(audienceToSave({ visibility: 'except', groupIds: [] }, groups)).toEqual({ visibility: 'all', groupIds: [] });
    expect(audienceToSave({ visibility: 'only', groupIds: [] }, groups)).toEqual({ visibility: 'only', groupIds: [] });
    expect(audienceToSave({ visibility: 'only', groupIds: ['fam', 'gone'] }, groups)).toEqual({
      visibility: 'only',
      groupIds: ['fam'],
    });
  });
});

describe('audienceLabel', () => {
  it('describes each rule', () => {
    expect(audienceLabel(undefined, groups)).toBe('All friends');
    expect(audienceLabel({ visibility: 'only', groupIds: ['close'] }, groups)).toBe('Only Close friends');
    expect(audienceLabel({ visibility: 'only', groupIds: ['close', 'fam', 'work'] }, groups)).toBe(
      'Only Close friends, Family and Work friends'
    );
    expect(audienceLabel({ visibility: 'only', groupIds: [] }, groups)).toBe('Only you');
    expect(audienceLabel({ visibility: 'except', groupIds: ['work'] }, groups)).toBe('All friends except Work friends');
    expect(audienceLabel({ visibility: 'except', groupIds: ['gone'] }, groups)).toBe('All friends');
  });
});

describe('canSee and reach', () => {
  it('mirrors the database rule', () => {
    expect(canSee(null, [])).toBe(true);
    expect(canSee({ visibility: 'only', groupIds: ['close'] }, ['close'])).toBe(true);
    expect(canSee({ visibility: 'only', groupIds: ['close'] }, ['work'])).toBe(false);
    expect(canSee({ visibility: 'except', groupIds: ['work'] }, ['work', 'fam'])).toBe(false);
    expect(canSee({ visibility: 'except', groupIds: ['work'] }, [])).toBe(true);
  });
  it('counts the friends an item reaches', () => {
    const friends = ['priya', 'mei', 'tom', 'josh', 'ruby'];
    expect(reach(null, groups, friends)).toBe(5);
    expect(reach({ visibility: 'only', groupIds: ['close', 'fam'] }, groups, friends)).toBe(3);
    expect(reach({ visibility: 'except', groupIds: ['fam'] }, groups, friends)).toBe(3);
  });
});

describe('group names', () => {
  it('needs a unique name of up to 40 characters', () => {
    expect(groupNameError('  ', groups)).toBe('Give the group a name.');
    expect(groupNameError('x'.repeat(41), groups)).toMatch(/40 characters/);
    expect(groupNameError(' family ', groups)).toMatch(/already have/);
    expect(groupNameError('Family', groups, 'fam')).toBeNull();
    expect(groupNameError('Poor book maintainers', groups)).toBeNull();
  });
  it('suggests names not already used', () => {
    expect(unusedSuggestions(groups)).toEqual(['Neighbours', 'Book club']);
  });
});
