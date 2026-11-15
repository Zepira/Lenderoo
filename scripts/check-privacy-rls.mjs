// Checks that the local Supabase only exposes what the privacy policy says
// (migration 049). Run against the LOCAL stack with the demo seed loaded:
//
//   npx supabase start --exclude edge-runtime,logflare,vector,studio
//   npx supabase db reset
//   node scripts/check-privacy-rls.mjs
//
// Pass --delete-account to also run the delete-account edge function on a
// throwaway user (needs `npx supabase functions serve` running).
//
// Never point this at the hosted project: it creates and deletes users.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API_URL = status.API_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(API_URL)) throw new Error(`Refusing to run against ${API_URL}`);
const ANON = status.ANON_KEY;
const SERVICE = status.SERVICE_ROLE_KEY;
const PASSWORD = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8').match(/crypt\('([^']+)'/)[1];

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(API_URL, ANON, opts);
const admin = createClient(API_URL, SERVICE, opts);

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `\n      ${detail}` : ''}`);
  if (!ok) failures++;
}
async function signIn(email, password = PASSWORD) {
  const c = createClient(API_URL, ANON, opts);
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return { c, id: data.user.id };
}
const rows = async (q) => {
  const { data, error } = await q;
  return { data: data ?? [], error };
};
const emptyOrDenied = ({ data, error }) => Boolean(error) || data.length === 0;

// ── Signed out: nothing ─────────────────────────────────────────────────────
for (const t of ['users', 'public_profiles', 'user_friends', 'borrow_history', 'borrow_history_with_users', 'borrow_requests_with_details', 'items']) {
  const r = await rows(anon.from(t).select('*').limit(5));
  check(`anon cannot read ${t}`, emptyOrDenied(r), JSON.stringify(r.data).slice(0, 200));
}
{
  const r = await rows(anon.rpc('search_users', { p_query: 'Priya' }));
  check('anon cannot call search_users', emptyOrDenied(r));
  const r2 = await rows(anon.rpc('find_user_by_friend_code', { p_code: 'PRIY02' }));
  check('anon cannot call find_user_by_friend_code', emptyOrDenied(r2));
}

// ── Signed in as the demo user ──────────────────────────────────────────────
const sam = await signIn('demo@lenderoo.test');
{
  const r = await rows(sam.c.from('users').select('*'));
  check('users: only own row', r.data.length === 1 && r.data[0].id === sam.id, `${r.data.length} rows`);
  check('users: own row includes email', r.data[0]?.email === 'demo@lenderoo.test');

  const p = await rows(sam.c.from('public_profiles').select('*'));
  check('public_profiles lists other users', p.data.length > 1);
  check('public_profiles has only id, name, avatar_url', p.data.every((x) => Object.keys(x).sort().join() === 'avatar_url,id,name'), Object.keys(p.data[0] ?? {}).join());
  const pe = await rows(sam.c.from('public_profiles').select('email'));
  check('public_profiles has no email column', Boolean(pe.error));

  const s1 = await rows(sam.c.rpc('search_users', { p_query: 'pri' }));
  check('search by partial name finds Priya', s1.data.some((u) => u.name === 'Priya Nair'));
  check('search results have no email', s1.data.every((u) => !('email' in u) && !('friend_code' in u)));
  const s2 = await rows(sam.c.rpc('search_users', { p_query: 'PRIYA@lenderoo.test' }));
  check('search by exact email (any case) finds Priya', s2.data.length === 1 && s2.data[0].name === 'Priya Nair');
  const s3 = await rows(sam.c.rpc('search_users', { p_query: 'lenderoo.test' }));
  check('search by partial email finds nobody', s3.data.length === 0, JSON.stringify(s3.data));
  const s4 = await rows(sam.c.rpc('search_users', { p_query: '%' }));
  check('LIKE wildcards are literal', s4.data.length === 0, JSON.stringify(s4.data));
  const s5 = await rows(sam.c.rpc('search_users', { p_query: 'Sam' }));
  check('search excludes yourself', !s5.data.some((u) => u.id === sam.id));

  const f = await rows(sam.c.rpc('find_user_by_friend_code', { p_code: ' priy02 ' }));
  check('friend code lookup (trimmed, any case)', f.data.length === 1 && f.data[0].name === 'Priya Nair' && !('email' in f.data[0]));

  const uf = await rows(sam.c.from('user_friends').select('*'));
  check('user_friends: has friends', uf.data.length > 0);
  check('user_friends: only my connections', uf.data.every((r) => r.user_id === sam.id));
  check('user_friends: no email or friend code', uf.data.every((r) => r.friend_email === null && r.friend_code === null));
  check('user_friends: names filled', uf.data.every((r) => r.friend_name));

  const { data: myItems } = await sam.c.from('items').select('id').eq('user_id', sam.id);
  const mine = new Set(myItems.map((i) => i.id));
  const bh = await rows(sam.c.from('borrow_history').select('*'));
  check('borrow_history: only loans I lent or borrowed', bh.data.length > 0 && bh.data.every((r) => r.friend_id === sam.id || mine.has(r.item_id)), `${bh.data.length} rows`);
  // Every seeded loan involves the demo user, so check from a friend's side
  // too: Priya must not see loans between the demo user and other people.
  const priya = await signIn('priya@lenderoo.test');
  const { data: priyaItems } = await priya.c.from('items').select('id').eq('user_id', priya.id);
  const hers = new Set(priyaItems.map((i) => i.id));
  const pbh = await rows(priya.c.from('borrow_history').select('*'));
  const { count: total } = await admin.from('borrow_history').select('*', { count: 'exact', head: true });
  check("friend's borrow_history: only loans involving her", pbh.data.every((r) => r.friend_id === priya.id || hers.has(r.item_id)), `${pbh.data.length} rows`);
  check("friend's borrow_history: not the whole table", pbh.data.length < total, `${pbh.data.length} of ${total}`);

  const bhu = await rows(sam.c.from('borrow_history_with_users').select('*'));
  check('borrow_history_with_users: same rows as borrow_history', bhu.data.length === bh.data.length);
  check('borrow_history_with_users: names, no emails', bhu.data.every((r) => r.borrower_email === null) && bhu.data.some((r) => r.borrower_name));

  const br = await rows(sam.c.from('borrow_requests_with_details').select('*'));
  check('borrow_requests_with_details: rows with names, no emails', br.data.length > 0 && br.data.every((r) => r.requester_name && r.owner_name && r.requester_email === null && r.owner_email === null), br.error?.message);
}


// ── Friend groups and item visibility (migration 051) ───────────────────────
{
  const sam = await signIn('demo@lenderoo.test');
  const priya = await signIn('priya@lenderoo.test');
  const josh = await signIn('josh@lenderoo.test');
  const { data: samItems } = await sam.c.from('items').select('id').eq('user_id', sam.id).is('borrowed_by', null).limit(1);
  const itemId = samItems[0].id;
  const sees = async (who) => (await rows(who.c.from('items').select('id').eq('id', itemId))).data.length === 1;

  const { data: group, error: gErr } = await sam.c.from('friend_groups').insert({ owner_id: sam.id, name: 'Close friends' }).select().single();
  check('owner creates a group', !gErr, gErr?.message);
  const { error: mErr } = await sam.c.from('friend_group_members').insert({ group_id: group.id, friend_id: priya.id });
  check('owner adds a friend to it', !mErr, mErr?.message);
  try {
    check('no rule: every friend sees the item', (await sees(priya)) && (await sees(josh)));

    await sam.c.from('item_audience').upsert({ item_id: itemId, visibility: 'only', group_ids: [group.id] });
    check("'only': a member sees it", await sees(priya));
    check("'only': a non-member doesn't", !(await sees(josh)));
    const { error: reqErr } = await josh.c.from('borrow_requests').insert({ item_id: itemId, requester_id: josh.id, owner_id: sam.id, status: 'pending' });
    check("'only': a non-member can't request it", Boolean(reqErr));

    await sam.c.from('item_audience').upsert({ item_id: itemId, visibility: 'except', group_ids: [group.id] });
    check("'except': a member doesn't see it", !(await sees(priya)));
    check("'except': everyone else does", await sees(josh));

    // Someone who already asked keeps seeing it when the owner narrows it later.
    const { data: req, error: jReqErr } = await josh.c.from('borrow_requests').insert({ item_id: itemId, requester_id: josh.id, owner_id: sam.id, status: 'pending' }).select().single();
    check('a visible item can be requested', !jReqErr, jReqErr?.message);
    await sam.c.from('item_audience').upsert({ item_id: itemId, visibility: 'only', group_ids: [group.id] });
    check('a pending requester still sees an item narrowed later', await sees(josh));
    if (req) await admin.from('borrow_requests').delete().eq('id', req.id);
    check('...and stops once the request is gone', !(await sees(josh)));

    for (const t of ['friend_groups', 'friend_group_members', 'item_audience']) {
      const r = await rows(priya.c.from(t).select('*'));
      check(`a friend can't read the owner's ${t}`, r.data.length === 0, `${r.data.length} rows`);
    }
    const { data: pItems } = await priya.c.from('items').select('id').eq('user_id', priya.id).limit(1);
    const { error: stealErr } = await priya.c.from('item_audience').upsert({ item_id: pItems[0].id, visibility: 'only', group_ids: [group.id] });
    check("can't use someone else's group on your item", Boolean(stealErr));
    const { error: foreignErr } = await priya.c.from('item_audience').upsert({ item_id: itemId, visibility: 'all' });
    check("can't change the rule on someone else's item", Boolean(foreignErr) || !(await sees(josh)));
    const { error: addErr } = await priya.c.from('friend_group_members').insert({ group_id: group.id, friend_id: priya.id });
    check("can't add yourself to someone else's group", Boolean(addErr));

    await sam.c.from('users').update({ default_visibility: 'only', default_visibility_groups: [group.id] }).eq('id', sam.id);
    const { data: fresh, error: freshErr } = await sam.c.from('items').insert({ user_id: sam.id, name: 'Visibility check item', category: 'other' }).select('id').single();
    check('a new item is saved', !freshErr, freshErr?.message);
    if (fresh) {
      const { data: fa } = await sam.c.from('item_audience').select('visibility, group_ids').eq('item_id', fresh.id).single();
      check("a new item starts with the owner's default", fa?.visibility === 'only' && fa.group_ids[0] === group.id, JSON.stringify(fa));
      const v = async (who) => (await rows(who.c.from('items').select('id').eq('id', fresh.id))).data.length === 1;
      check('...so friends outside it never see it', !(await v(josh)) && (await v(priya)));
      await admin.from('items').delete().eq('id', fresh.id);
    }
    await sam.c.from('friend_groups').delete().eq('id', group.id);
    const { data: aud } = await admin.from('item_audience').select('group_ids').eq('item_id', itemId).single();
    check('deleting a group takes it out of item rules', aud.group_ids.length === 0, JSON.stringify(aud));
    const { data: me } = await admin.from('users').select('default_visibility_groups').eq('id', sam.id).single();
    check("...and out of the owner's default", me.default_visibility_groups.length === 0, JSON.stringify(me));
  } finally {
    await admin.from('item_audience').delete().eq('item_id', itemId);
    await admin.from('friend_groups').delete().eq('id', group.id);
    await admin.from('users').update({ default_visibility: 'all', default_visibility_groups: [] }).eq('id', sam.id);
  }
}

// ── A user with no friends sees no one's history ────────────────────────────
const outsiderEmail = `outsider-${Date.now()}@lenderoo.test`;
const { data: created, error: createErr } = await admin.auth.admin.createUser({ email: outsiderEmail, password: PASSWORD, email_confirm: true, user_metadata: { name: 'Outsider', phone: '0400 000 000' } });
if (createErr) throw createErr;
// The local stack has no on_auth_user_created trigger (it's commented out in
// 001 and was created by hand on the hosted project), so add the profile row
// the way that trigger would.
await admin.from('users').upsert({ id: created.user.id, email: outsiderEmail, name: 'Outsider', phone: '0400 000 000' });
try {
  const out = await signIn(outsiderEmail);
  for (const t of ['borrow_history', 'borrow_history_with_users', 'user_friends', 'borrow_requests_with_details']) {
    const r = await rows(out.c.from(t).select('*'));
    check(`outsider sees no ${t}`, r.data.length === 0, `${r.data.length} rows`);
  }
  const r = await rows(out.c.from('users').select('id'));
  check('outsider sees only own users row', r.data.length === 1);

  if (process.argv.includes('--delete-account')) {
    await deleteAccountCheck(out);
  }
} finally {
  await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
}

async function deleteAccountCheck(user) {
  const tiny = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  for (const bucket of ['avatars', 'item-images']) {
    for (const n of ['a.png', 'b.png']) {
      const { error } = await user.c.storage.from(bucket).upload(`${user.id}/${n}`, tiny, { contentType: 'image/png' });
      if (error) throw new Error(`upload ${bucket}: ${error.message}`);
    }
  }
  await user.c.from('users').update({ phone: '0400000000', avatar_url: `${API_URL}/storage/v1/object/public/avatars/${user.id}/a.png` }).eq('id', user.id);
  await admin.from('friends').insert({ user_id: user.id, name: 'Legacy contact' });
  const { data: g } = await user.c.from('friend_groups').insert({ owner_id: user.id, name: 'Work friends' }).select().single();
  const { data: samG } = await admin.from('friend_groups').insert({ owner_id: '00000000-0000-4000-a000-000000000001', name: 'Outsider test' }).select().single();
  await admin.from('friend_group_members').insert({ group_id: samG.id, friend_id: user.id });

  const { data: session } = await user.c.auth.getSession();
  const res = await fetch(`${API_URL}/functions/v1/delete-account`, { method: 'POST', headers: { Authorization: `Bearer ${session.session.access_token}`, apikey: ANON } });
  check('delete-account returns 200', res.ok, `${res.status} ${await res.clone().text()}`);

  for (const bucket of ['avatars', 'item-images']) {
    const { data } = await admin.storage.from(bucket).list(user.id);
    check(`delete-account: ${bucket}/${user.id}/ is empty`, (data ?? []).length === 0, `${data?.length} files`);
  }
  const { data: au } = await admin.auth.admin.getUserById(user.id);
  const meta = au.user.user_metadata ?? {};
  check('delete-account: auth email scrubbed', au.user.email.endsWith('@lenderoo.invalid'), au.user.email);
  check('delete-account: auth metadata name/phone cleared', !meta.name && !meta.phone && !meta.avatar_url, JSON.stringify(meta));
  const ident = (au.user.identities ?? []).map((i) => i.identity_data?.email).filter(Boolean);
  check('delete-account: no real email left in identities', ident.every((e) => e.endsWith('@lenderoo.invalid')), ident.join());
  const { data: row } = await admin.from('users').select('name, email, phone, avatar_url, friend_code, push_token, deleted_at').eq('id', user.id).single();
  check('delete-account: profile row tombstoned', row.name === 'Deleted User' && !row.phone && !row.avatar_url && !row.friend_code && !row.push_token && row.deleted_at, JSON.stringify(row));
  const { data: legacy } = await admin.from('friends').select('id').eq('user_id', user.id);
  check('delete-account: legacy friends rows deleted', (legacy ?? []).length === 0);
  const { data: groups } = await admin.from('friend_groups').select('id').eq('owner_id', user.id);
  check('delete-account: their friend groups deleted', (groups ?? []).length === 0 && Boolean(g));
  const { data: inGroups } = await admin.from('friend_group_members').select('group_id').eq('friend_id', user.id);
  check("delete-account: removed from other people's groups", (inGroups ?? []).length === 0);
  await admin.from('friend_groups').delete().eq('id', samG.id);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
