/**
 * An item's photos (items.images): up to MAX_PHOTOS, the first is the cover (cards, lists).
 * Local file URIs are uploaded on save; anything already http(s) is kept as is. Pure.
 */
export const MAX_PHOTOS = 8;

export const isLocalPhoto = (uri: string) => !/^https?:\/\//.test(uri);

/** Adds photos to the end, skipping repeats, up to MAX_PHOTOS. */
export function addPhotos(list: string[], uris: string[], max = MAX_PHOTOS): string[] {
  const out = [...list];
  for (const u of uris) if (u && !out.includes(u) && out.length < max) out.push(u);
  return out;
}

export const removePhoto = (list: string[], index: number) => list.filter((_, i) => i !== index);

/** Moves a photo to the front, making it the cover. */
export function makeCover(list: string[], index: number): string[] {
  if (index <= 0 || index >= list.length) return list;
  return [list[index], ...list.filter((_, i) => i !== index)];
}

/** How many more can be added. */
export const photosLeft = (list: string[], max = MAX_PHOTOS) => Math.max(0, max - list.length);

/** Our own stored photos that were on the item before and aren't now (to delete from storage). */
export function removedStoredPhotos(before: string[], after: string[], bucket = 'item-images'): string[] {
  return before.filter((u) => !after.includes(u) && u.includes(`/${bucket}/`));
}

/** Everything the item has, oldest field shapes included, cover first. */
export function photosOf(item: { images?: string[]; imageUrls?: string[]; imageUrl?: string }): string[] {
  const list = item.images?.length ? item.images : item.imageUrls?.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [];
  return list.filter(Boolean).slice(0, MAX_PHOTOS);
}
