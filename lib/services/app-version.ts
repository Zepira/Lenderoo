/**
 * Records which build of Lenderoo this person has installed (migration 054), so Alana can see who
 * has and hasn't updated (SELECT * FROM app_version_report in the Supabase dashboard). Nobody can
 * read it back through the app.
 */
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

/** At most this often per app session (sign-in always records). */
export const RECORD_EVERY_MS = 30 * 60 * 1000;

let lastRecorded: { userId: string; at: number } | null = null;

/** Whether to record now: a different user, or long enough since the last time. Pure. */
export function shouldRecord(
  last: { userId: string; at: number } | null,
  userId: string,
  now: number,
  every = RECORD_EVERY_MS
): boolean {
  return !last || last.userId !== userId || now - last.at >= every;
}

/** Never throws: a failure just means this launch isn't recorded. */
export async function recordAppVersion(userId: string, { force = false } = {}): Promise<void> {
  const now = Date.now();
  if (!force && !shouldRecord(lastRecorded, userId, now)) return;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  const version = Application.nativeApplicationVersion;
  if (!version) return;
  lastRecorded = { userId, at: now };
  try {
    const { error } = await supabase.rpc('record_app_version', {
      p_platform: Platform.OS,
      p_app_version: version,
      p_build_number: Application.nativeBuildVersion ?? null,
      p_os_version: Device.osVersion ?? null,
    });
    if (error) lastRecorded = null;
  } catch {
    lastRecorded = null;
  }
}
