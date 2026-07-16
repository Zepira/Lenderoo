import { createClient } from 'jsr:@supabase/supabase-js@2';

interface MatchContactsRequest {
  hashes: string[];
}

interface MatchedUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Which of the caller's own hashes this account matched on — lets the
   *  client look up its local contact name for this person. */
  matchedHash: string;
}

// Looks up which of the caller's device contacts (sent as SHA-256 hashes of
// normalized phone/email, never raw values) already have a Lenderoo account.
// `verify_jwt` is on (default) — the platform validates the caller's JWT
// before this runs; we still parse it ourselves to resolve the caller's id.
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

  let payload: MatchContactsRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const hashes = (payload.hashes ?? []).filter(
    (h): h is string => typeof h === 'string' && h.length > 0,
  );
  if (hashes.length === 0) {
    return new Response(JSON.stringify({ matches: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // PostgREST's .in() serializes values into the request URL — a real
  // contact list easily produces enough 64-char hex hashes to blow past URL
  // length limits, so chunk the lookup rather than sending it in one go.
  const HASH_CHUNK_SIZE = 200;
  const hashRows: { user_id: string; hash: string }[] = [];
  for (let i = 0; i < hashes.length; i += HASH_CHUNK_SIZE) {
    const chunk = hashes.slice(i, i + HASH_CHUNK_SIZE);
    const { data, error: hashError } = await supabase
      .from('user_contact_hashes')
      .select('user_id, hash')
      .in('hash', chunk)
      .neq('user_id', user.id);

    if (hashError) {
      return new Response(`query error: ${hashError.message}`, { status: 500 });
    }
    hashRows.push(...(data ?? []));
  }

  // The hash itself is one of the ones the caller sent us — not a secret,
  // and it's what lets the client trace a match back to which of *their own*
  // local contacts it came from (to show that contact's saved name) without
  // us ever learning or storing raw contact data ourselves.
  const matchedHashByUserId = new Map<string, string>();
  for (const row of hashRows) {
    if (!matchedHashByUserId.has(row.user_id)) {
      matchedHashByUserId.set(row.user_id, row.hash);
    }
  }

  const candidateIds = [...new Set((hashRows ?? []).map((r) => r.user_id as string))];
  if (candidateIds.length === 0) {
    return new Response(JSON.stringify({ matches: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Exclude anyone already connected (pending or active) — same intent as
  // the client-side exclusion in lib/services/friends.ts's searchUsers.
  const { data: connections } = await supabase
    .from('friend_connections')
    .select('user_id, friend_user_id')
    .or(`user_id.eq.${user.id},friend_user_id.eq.${user.id}`);

  const connectedIds = new Set<string>();
  for (const c of connections ?? []) {
    if (c.user_id === user.id) connectedIds.add(c.friend_user_id as string);
    if (c.friend_user_id === user.id) connectedIds.add(c.user_id as string);
  }

  const remainingIds = candidateIds.filter((id) => !connectedIds.has(id));
  if (remainingIds.length === 0) {
    return new Response(JSON.stringify({ matches: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, avatar_url')
    .in('id', remainingIds)
    .is('deleted_at', null);

  if (usersError) {
    return new Response(`query error: ${usersError.message}`, { status: 500 });
  }

  const matches: MatchedUser[] = (users ?? []).map((u) => ({
    id: u.id as string,
    name: u.name as string,
    email: u.email as string,
    avatarUrl: (u.avatar_url as string | null) ?? null,
    matchedHash: matchedHashByUserId.get(u.id as string) ?? '',
  }));

  return new Response(JSON.stringify({ matches }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
