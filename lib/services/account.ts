/**
 * Account deletion
 *
 * Calls the delete-account edge function, which scrubs and tombstones the
 * user's row (not a hard delete — see supabase/functions/delete-account
 * for the full data-fate breakdown) and bans the auth record. Caller is
 * responsible for signing out locally afterward.
 */

import { supabase } from '../supabase';

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account');

  if (error) {
    throw new Error(`Failed to delete account: ${error.message}`);
  }
}
