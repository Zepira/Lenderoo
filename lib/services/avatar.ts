import { stripImageMetadata } from './image';
import { uploadImageBuffer } from './storage';

// ── Preset avatars ────────────────────────────────────────────────────────────

export const PRESET_AVATARS = [
  {
    id: "quokka",
    name: "Quokka",
    source: require("../../assets/images/avatars/quokka.png"),
  },
  {
    id: "cockatoo",
    name: "Cockatoo",
    source: require("../../assets/images/avatars/cockatoo.png"),
  },
  {
    id: "devil",
    name: "Tasmanian Devil",
    source: require("../../assets/images/avatars/devil.png"),
  },
  {
    id: "echidna",
    name: "Echidna",
    source: require("../../assets/images/avatars/echidna.png"),
  },
  {
    id: "galah",
    name: "Galah",
    source: require("../../assets/images/avatars/galah.png"),
  },
  {
    id: "kangaroo",
    name: "Kangaroo",
    source: require("../../assets/images/avatars/kangaroo.png"),
  },
  {
    id: "koala",
    name: "Koala",
    source: require("../../assets/images/avatars/koala.png"),
  },
  {
    id: "kookaburra",
    name: "Kookaburra",
    source: require("../../assets/images/avatars/kookaburra.png"),
  },
  {
    id: "platypus",
    name: "Platypus",
    source: require("../../assets/images/avatars/platypus.png"),
  },
] as const;

export type PresetAvatar = (typeof PRESET_AVATARS)[number];

const PRESET_PREFIX = "preset:";

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

export function presetId(id: PresetAvatar["id"]): string {
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
  // Strip EXIF metadata before upload by re-encoding as JPEG
  const processedUri = await stripImageMetadata(uri);
  return uploadImageBuffer(processedUri, "avatars", `${userId}/${Date.now()}.jpg`, true);
}
