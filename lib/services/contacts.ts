/**
 * Contact-based friend discovery
 *
 * Reads the device contact list, hashes each phone/email locally, and asks
 * the match-contacts edge function which of those hashes belong to existing
 * Lenderoo users. Raw contact data (names, every phone/email) never leaves
 * the device — only the hashes are sent.
 */

import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';
import { supabase } from '../supabase';

// Tag every log so it's easy to filter in Metro/logcat while debugging the
// contact-matching flow. Only counts are logged — never raw contact values.
const LOG_TAG = '[contacts]';

export interface MatchedContactUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ContactMatchResult {
  matches: MatchedContactUser[];
  /** Number of distinct device contacts that didn't match any account. */
  unmatchedCount: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

async function sha256Hex(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

/**
 * Request permission to read contacts. Returns false if denied — callers
 * should show a message pointing the user to system settings.
 */
export async function requestContactsPermission(): Promise<boolean> {
  const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
  console.error(LOG_TAG, 'permission result', { platform: Platform.OS, status, canAskAgain });
  return status === 'granted';
}

/**
 * Read device contacts and produce the deduplicated set of normalized,
 * hashed phone numbers and emails for matching.
 */
export async function getContactHashes(): Promise<{
  hashes: string[];
  contactCount: number;
}> {
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
  });

  console.error(LOG_TAG, 'device contacts read', {
    platform: Platform.OS,
    contactCount: data.length,
  });

  const hashSet = new Set<string>();
  const rawValues = new Set<string>();
  let phoneCount = 0;
  let emailCount = 0;

  for (const contact of data) {
    for (const p of contact.phoneNumbers ?? []) {
      const normalized = p.number ? normalizePhone(p.number) : '';
      if (!normalized) continue;
      phoneCount++;
      rawValues.add(`phone:${normalized}`);
      // Android and iOS don't consistently export a country code for
      // locally-entered contacts, so also hash the last-10-digit national
      // number — matches an account phone regardless of which side has it.
      const last10 = normalized.slice(-10);
      if (last10 !== normalized) rawValues.add(`phone:${last10}`);
    }
    for (const e of contact.emails ?? []) {
      const normalized = e.email ? normalizeEmail(e.email) : '';
      if (normalized) {
        emailCount++;
        rawValues.add(`email:${normalized}`);
      }
    }
  }

  await Promise.all(
    [...rawValues].map(async (key) => {
      const value = key.slice(key.indexOf(':') + 1);
      hashSet.add(await sha256Hex(value));
    }),
  );

  console.error(LOG_TAG, 'normalized + hashed', {
    platform: Platform.OS,
    phoneCount,
    emailCount,
    rawValueCount: rawValues.size,
    hashCount: hashSet.size,
  });

  return { hashes: [...hashSet], contactCount: data.length };
}

/**
 * Full flow: read contacts, hash them, and ask the server which hashes
 * match an existing (and not-already-friended) Lenderoo account.
 */
export async function findContactsOnLenderoo(): Promise<ContactMatchResult> {
  const { hashes, contactCount } = await getContactHashes();
  if (hashes.length === 0) {
    console.error(LOG_TAG, 'no hashes to send, skipping edge function call', {
      platform: Platform.OS,
      contactCount,
    });
    return { matches: [], unmatchedCount: 0 };
  }

  console.error(LOG_TAG, 'invoking match-contacts', {
    platform: Platform.OS,
    hashesSent: hashes.length,
  });

  const { data, error } = await supabase.functions.invoke('match-contacts', {
    body: { hashes },
  });

  if (error) {
    console.error(LOG_TAG, 'match-contacts error', {
      platform: Platform.OS,
      message: error.message,
      context: (error as any).context?.status,
    });
    throw new Error(`Failed to match contacts: ${error.message}`);
  }

  const matches: MatchedContactUser[] = data?.matches ?? [];
  const unmatchedCount = Math.max(contactCount - matches.length, 0);

  console.error(LOG_TAG, 'match-contacts result', {
    platform: Platform.OS,
    matchCount: matches.length,
    unmatchedCount,
  });

  return { matches, unmatchedCount };
}
