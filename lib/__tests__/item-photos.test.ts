import { describe, expect, it } from '@jest/globals';
import { addPhotos, isLocalPhoto, makeCover, photosLeft, photosOf, removePhoto, removedStoredPhotos } from '../item-photos';

describe('item photos', () => {
  it('adds without repeats, up to the limit', () => {
    expect(addPhotos(['a'], ['b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    expect(addPhotos(['a', 'b'], ['c', 'd'], 3)).toEqual(['a', 'b', 'c']);
    expect(photosLeft(['a', 'b'], 3)).toBe(1);
    expect(photosLeft(['a', 'b', 'c', 'd'], 3)).toBe(0);
  });
  it('removes and makes a cover', () => {
    expect(removePhoto(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
    expect(makeCover(['a', 'b', 'c'], 2)).toEqual(['c', 'a', 'b']);
    expect(makeCover(['a', 'b'], 0)).toEqual(['a', 'b']);
    expect(makeCover(['a', 'b'], 5)).toEqual(['a', 'b']);
  });
  it('knows local photos from uploaded ones', () => {
    expect(isLocalPhoto('file:///tmp/x.jpg')).toBe(true);
    expect(isLocalPhoto('https://x.supabase.co/storage/v1/object/public/item-images/u/1.jpg')).toBe(false);
  });
  it('finds stored photos that were removed, never external ones', () => {
    const s1 = 'https://x.supabase.co/storage/v1/object/public/item-images/u/1.jpg';
    const s2 = 'https://x.supabase.co/storage/v1/object/public/item-images/u/2.jpg';
    const cover = 'https://covers.example.com/book.jpg';
    expect(removedStoredPhotos([s1, s2, cover], [s2])).toEqual([s1]);
  });
  it('reads every field shape, cover first', () => {
    expect(photosOf({ images: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(photosOf({ imageUrls: ['c'] })).toEqual(['c']);
    expect(photosOf({ imageUrl: 'd' })).toEqual(['d']);
    expect(photosOf({})).toEqual([]);
    expect(photosOf({ images: Array.from({ length: 10 }, (_, i) => String(i)) })).toHaveLength(8);
  });
});
