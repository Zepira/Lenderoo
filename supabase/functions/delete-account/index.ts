import { createClient } from 'jsr:@supabase/supabase-js@2';

// Deletes the caller's account. Not a hard delete of the users row — it's
// scrubbed and tombstoned (deleted_at set) so every FK pointing at it
// (closed borrow_history entries, items now correctly marked returned)
// stays valid instead of orphaning. See supabase/migrations/042_account_deletion.sql
// and CLAUDE.md for the full data-fate breakdown this implements:
//
// - Items they own with an active borrower right now: force-returned (same
//   field changes confirmHandoff's "returning to owner" branch makes) and a
//   closing borrow_history entry written, then the item itself is deleted —
//   its owner is about to be a tombstone, so there's nothing left to keep it
//   for.
// - Items someone else owns that they currently have borrowed: force-returned
//   the same way, but the item itself is kept (the real owner still needs
//   it to exist, now available again).
// - Items they own with no active borrower: deleted outright (cascades away
//   any borrow_requests for it).
// - Any item where they're mid-handoff (pending_recipient_id) but haven't
//   confirmed yet: the pending fields are just cleared — the handoff never
//   completed, so there's no history to write.
// - friend_connections, remaining borrow_requests, favourites, availability
//   subscriptions, contact hashes and legacy `friends` rows: hard-deleted —
//   nothing else has a stake in these once the account is gone.
// - Their files in the public `avatars` and `item-images` buckets (everything
//   under `<userId>/`): deleted, so no photo stays reachable by URL.
// - The auth.users row is banned (not deleted), its email scrubbed, its
//   password replaced with a random one nobody knows (so the old password
//   hash is gone) and the name/phone/avatar copied into user_metadata at
//   sign-up cleared, so the id stays valid but the account can never sign in
//   again and no PII is left.
//
// Keep the lenderoo.app "Delete your account and data" page
// (lenderoo.com repo, src/components/DataDeletion.tsx) in step with this list.

const STORAGE_BUCKETS = ['avatars', 'item-images'] as const;

// Removes every object under `<userId>/` in a bucket. Uploads are flat
// (`<userId>/<file>`), so one level is enough. Lists in pages and repeats
// until the folder is empty; capped so a storage fault can't loop forever.
// deno-lint-ignore no-explicit-any
async function deleteUserFolder(supabase: any, bucket: string, userId: string): Promise<number> {
  let removed = 0;
  for (let round = 0; round < 50; round++) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(userId, { limit: 1000 });
    if (error) throw new Error(`Failed to list ${bucket}: ${error.message}`);
    const paths = (files ?? [])
      .filter((f: { id: string | null }) => f.id !== null) // skip sub-folders
      .map((f: { name: string }) => `${userId}/${f.name}`);
    if (paths.length === 0) return removed;
    const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
    if (removeError) throw new Error(`Failed to delete ${bucket} files: ${removeError.message}`);
    removed += paths.length;
  }
  return removed;
}
Deno.serve(async (req) => {
  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return new Response('Unauthorized', { status: 401 });
  }

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const {
    data: { user },
    error: authError,
  } = await anonClient.auth.getUser(jwt);

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = user.id;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date().toISOString();

  try {
    // ── Items they own that are currently lent out — force-return, close
    //    history, then delete the item (its owner is about to be a ghost).
    const { data: ownedActive } = await supabase
      .from('items')
      .select('id, borrowed_by, borrowed_date, due_date')
      .eq('user_id', userId)
      .not('borrowed_by', 'is', null);

    for (const item of ownedActive ?? []) {
      await supabase.from('borrow_history').insert({
        item_id: item.id,
        friend_id: item.borrowed_by,
        borrowed_date: item.borrowed_date,
        returned_date: now,
        due_date: item.due_date,
      });
      await supabase.from('items').delete().eq('id', item.id);
    }

    // ── Items they own with no active borrower — nothing else has a stake,
    //    delete outright. Cascades away any borrow_requests for them.
    await supabase.from('items').delete().eq('user_id', userId).is('borrowed_by', null);

    // ── Items someone else owns that they currently have borrowed —
    //    force-return so the real owner gets it back as available. Item
    //    itself stays (its owner is a real, non-deleted account).
    const { data: borrowedActive } = await supabase
      .from('items')
      .select('id, borrowed_date, due_date')
      .eq('borrowed_by', userId);

    for (const item of borrowedActive ?? []) {
      await supabase.from('borrow_history').insert({
        item_id: item.id,
        friend_id: userId,
        borrowed_date: item.borrowed_date,
        returned_date: now,
        due_date: item.due_date,
      });
      await supabase
        .from('items')
        .update({
          borrowed_by: null,
          borrowed_date: null,
          due_date: null,
          returned_date: null,
          pending_recipient_id: null,
          pending_since: null,
          updated_at: now,
        })
        .eq('id', item.id);
    }

    // ── Anywhere they're mid-handoff but never confirmed — the handoff
    //    never completed, just clear it. Covers both directions: someone
    //    else's item they were about to pick up, or an item they own that
    //    someone else was about to pick up (any such item was already
    //    deleted above since it had no active borrower yet).
    await supabase
      .from('items')
      .update({ pending_recipient_id: null, pending_since: null, updated_at: now })
      .eq('pending_recipient_id', userId);

    // ── Anything else that references them directly.
    await supabase
      .from('borrow_requests')
      .delete()
      .or(`requester_id.eq.${userId},owner_id.eq.${userId}`);

    await supabase
      .from('friend_connections')
      .delete()
      .or(`user_id.eq.${userId},friend_user_id.eq.${userId}`);

    await supabase.from('item_favourites').delete().eq('user_id', userId);
    await supabase.from('item_availability_subscriptions').delete().eq('user_id', userId);
    await supabase.from('user_contact_hashes').delete().eq('user_id', userId);
    // Legacy pre-friend_connections contact list (may not exist on every
    // database; ignore a missing-table error).
    await supabase.from('friends').delete().eq('user_id', userId);

    // ── Their photos in public storage (profile photo, item photos). Done
    //    after the item rows are gone so nothing still points at them.
    for (const bucket of STORAGE_BUCKETS) {
      await deleteUserFolder(supabase, bucket, userId);
    }

    // ── Tombstone the profile row itself.
    const placeholderEmail = `deleted-${userId}@lenderoo.invalid`;
    const { error: usersError } = await supabase
      .from('users')
      .update({
        name: 'Deleted User',
        email: placeholderEmail,
        phone: null,
        avatar_url: null,
        friend_code: null,
        push_token: null,
        deleted_at: now,
        updated_at: now,
      })
      .eq('id', userId);

    if (usersError) {
      throw new Error(`Failed to scrub profile: ${usersError.message}`);
    }

    // ── Ban the auth record and scrub its email, password and the sign-up
    //    metadata (name, phone, avatar) so the id stays valid (all the FKs
    //    above still resolve) but the account can never sign in and no PII
    //    sits in auth.users either. The password is overwritten with 32
    //    random bytes that are never stored or returned, which replaces the
    //    old hash. user_metadata is merged, so set each key to null rather
    //    than passing {}.
    const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
      email: placeholderEmail,
      password: randomPassword,
      user_metadata: { name: null, phone: null, avatar_url: null },
      ban_duration: '876000h', // ~100 years — effectively permanent
    });

    if (authUpdateError) {
      throw new Error(`Failed to disable login: ${authUpdateError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      `Account deletion failed: ${error instanceof Error ? error.message : String(error)}`,
      { status: 500 },
    );
  }
});
