import { describe, expect, it } from '@jest/globals';
import type { ItemCategory } from '../types';
import { applyItemFilters, categoryCounts, sortOptions, validFilters } from '../item-filters';

const d = (s: string) => new Date(s);
const item = (name: string, category: ItemCategory, created: string, due?: string) => ({
  name,
  category,
  createdAt: d(created),
  dueDate: due ? d(due) : undefined,
});
const items = [
  item('tent', 'camping', '2026-11-01'),
  item('Drill', 'tool', '2026-11-10', '2026-11-20'),
  item('book 10', 'book', '2026-11-05'),
  item('Book 2', 'book', '2026-11-12', '2026-11-18'),
  item('Axe', 'tool', '2026-11-03'),
];
const names = (xs: { name: string }[]) => xs.map((x) => x.name);

describe('categoryCounts', () => {
  it('lists the categories present, in picker order, with counts', () => {
    expect(categoryCounts(items)).toEqual([
      { category: 'book', count: 2 },
      { category: 'tool', count: 2 },
      { category: 'camping', count: 1 },
    ]);
    expect(categoryCounts([])).toEqual([]);
  });
});

describe('sortOptions', () => {
  it('offers due-back sorting only when something is due', () => {
    expect(sortOptions(items)).toEqual(['recent', 'az', 'due']);
    expect(sortOptions([item('x', 'other', '2026-01-01')])).toEqual(['recent', 'az']);
  });
});

describe('applyItemFilters', () => {
  it('sorts newest first by default', () => {
    expect(names(applyItemFilters(items, { category: null, sort: 'recent' }))).toEqual([
      'Book 2', 'Drill', 'book 10', 'Axe', 'tent',
    ]);
  });
  it('sorts A–Z ignoring case, with numbers in order', () => {
    expect(names(applyItemFilters(items, { category: null, sort: 'az' }))).toEqual([
      'Axe', 'Book 2', 'book 10', 'Drill', 'tent',
    ]);
  });
  it('puts the soonest due first and undated items last', () => {
    expect(names(applyItemFilters(items, { category: null, sort: 'due' }))).toEqual([
      'Book 2', 'Drill', 'book 10', 'Axe', 'tent',
    ]);
    const same = [item('b', 'book', '2026-01-01', '2026-02-01'), item('a', 'book', '2026-01-02', '2026-02-01')];
    expect(names(applyItemFilters(same, { category: null, sort: 'due' }))).toEqual(['a', 'b']);
  });
  it('keeps one category without changing the input', () => {
    const copy = [...items];
    expect(names(applyItemFilters(items, { category: 'tool', sort: 'az' }))).toEqual(['Axe', 'Drill']);
    expect(items).toEqual(copy);
  });
});

describe('validFilters', () => {
  it('falls back when the list no longer has the category or the sort', () => {
    const undated = [item('x', 'book', '2026-01-01')];
    expect(validFilters(undated, { category: 'tool', sort: 'due' })).toEqual({ category: null, sort: 'recent' });
    expect(validFilters(items, { category: 'tool', sort: 'due' })).toEqual({ category: 'tool', sort: 'due' });
  });
});
