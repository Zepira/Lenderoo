import { supabase } from '../supabase';

// ── Preset avatars ────────────────────────────────────────────────────────────

export const PRESET_AVATARS = [
  { id: 'cat',        name: 'Cat',              source: require('../../assets/images/avatars/cat avatar.png') },
  { id: 'cockatoo',   name: 'Cockatoo',         source: require('../../assets/images/avatars/cockatoo avatar.png') },
  { id: 'devil',      name: 'Tasmanian Devil',  source: require('../../assets/images/avatars/devil avatar.png') },
  { id: 'echidna',    name: 'Echidna',          source: require('../../assets/images/avatars/echidna avatar.png') },
  { id: 'galah',      name: 'Galah',            source: require('../../assets/images/avatars/Gallah avatar.png') },
  { id: 'kangaroo',   name: 'Kangaroo',         source: require('../../assets/images/avatars/kanagroo avatar.png') },
  { id: 'koala',      name: 'Koala',            source: require('../../assets/images/avatars/koala avatar.png') },
  { id: 'kookaburra', name: 'Kookaburra',       source: require('../../assets/images/avatars/kookaburra avatar.png') },
  { id: 'platypus',   name: 'Platypus',         source: require('../../assets/images/avatars/platypus avatar.png') },
] as const;

export type PresetAvatar = (typeof PRESET_AVATARS)[number];

const PRESET_PREFIX = 'preset:';

export function isPresetAvatar(url: string): boolean {
  return url.startsWith(PRESET_PREFIX);
}

export function getPresetAvatar(url: string): PresetAvatar | undefined {
  const id = url.slice(PRESET_PREFIX.length);
  return PRESET_AVATARS.find((a) => a.id === id);
}

/** Returns the correct image source for both preset and remote-URL avatars. */
export function resolveAvatarSource(
  avatarUrl?: string | null,
): { uri: string } | number | null {
  if (!avatarUrl) return null;
  if (isPresetAvatar(avatarUrl)) {
    return getPresetAvatar(avatarUrl)?.source ?? null;
  }
  return { uri: avatarUrl };
}

export function presetId(id: PresetAvatar['id']): string {
  return `${PRESET_PREFIX}${id}`;
}

// ── Supabase Storage upload ───────────────────────────────────────────────────

/**
 * Uploads a local image URI to the `avatars` Supabase Storage bucket and
 * returns the public URL.
 *
 * Requires a public bucket named `avatars` in your Supabase project.
 * Create it via: Dashboard → Storage → New bucket → name: "avatars", Public: on
 */
export async function uploadAvatarImage(
  userId: string,
  uri: string,
): Promise<string> {
  const ext = (uri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${userId}/${Date.now()}.${ext}`;

  // React Native FormData accepts { uri, name, type } as a file entry.
  const formData = new FormData();
  formData.append('file', { uri, name: `avatar.${ext}`, type: mimeType } as any);

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, formData, { upsert: true, contentType: mimeType });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);

  return publicUrl;
}
