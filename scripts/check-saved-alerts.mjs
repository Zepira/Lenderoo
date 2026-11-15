// Checks Saved items (migration 052) against the LOCAL Supabase stack with the demo seed:
// the rules on item_favourites, and who the push-notifications function would tell when a saved
// item is free again. Runs the function in dry-run mode, so nothing is sent.
//
//   npx supabase start --exclude logflare,vector,studio
//   npx supabase db reset
//   printf 'WEBHOOK_SECRET=local\nPUSH_DRY_RUN=1\n' > /tmp/push.env
//   npx supabase functions serve --env-file /tmp/push.env --no-verify-jwt
//   node scripts/check-saved-alerts.mjs
//
// Never point this at the hosted project.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API_URL = status.API_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(API_URL)) throw new Error(`Refusing to run against ${API_URL}`);
const PASSWORD = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8').match(/crypt\('([^']+)'/)[1];
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(API_URL, status.SERVICE_ROLE_KEY, opts);

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `\n      ${detail}` : ''}`);
  if (!ok) failures++;
};
const signIn = async (email) => {
  const c = createClient(API_URL, status.ANON_KEY, opts);
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return { c, id: data.user.id };
};

const sam = await signIn('demo@lenderoo.test');
const priya = await signIn('priya@lenderoo.test');
const josh = await signIn('josh@lenderoo.test');
const mei = await signIn('mei@lenderoo.test');

// A lent-out item of Sam's, borrowed by someone other than Priya, Josh and Mei.
const { data: lent } = await admin.from('items').select('id, name, borrowed_by').eq('user_id', sam.id).not('borrowed_by', 'is', null);
const item = lent.find((i) => ![priya.id, josh.id, mei.id].includes(i.borrowed_by));
const borrower = item.borrowed_by;
const tokens = { [priya.id]: 'ExponentPushToken[priya]', [josh.id]: 'ExponentPushToken[josh]', [mei.id]: 'ExponentPushToken[mei]', [borrower]: 'ExponentPushToken[borrower]' };
for (const [id, t] of Object.entries(tokens)) await admin.from('users').update({ push_token: t }).eq('id', id);

const cleanup = async () => {
  await admin.from('item_favourites').delete().eq('item_id', item.id);
  await admin.from('item_audience').delete().eq('item_id', item.id);
  await admin.from('friend_groups').delete().eq('owner_id', sam.id).eq('name', 'Saved check');
  for (const id of Object.keys(tokens)) await admin.from('users').update({ push_token: null }).eq('id', id);
};

try {
  // ── Rules ──
  const { error: ownErr } = await sam.c.from('item_favourites').insert({ item_id: item.id, user_id: sam.id });
  check("can't save your own item", Boolean(ownErr));
  for (const who of [priya, josh, mei]) {
    const { error } = await who.c.from('item_favourites').insert({ item_id: item.id, user_id: who.id });
    check(`a friend can save it (${who === priya ? 'Priya' : who === josh ? 'Josh' : 'Mei'})`, !error, error?.message);
  }
  await admin.from('item_favourites').insert({ item_id: item.id, user_id: borrower }).then(() => {});
  const { error: offErr } = await mei.c.from('item_favourites').update({ notify: false }).eq('item_id', item.id).eq('user_id', mei.id);
  check('you can turn the alert off', !offErr, offErr?.message);
  const { data: others } = await priya.c.from('item_favourites').select('user_id').eq('item_id', item.id);
  check("you only see your own saves", others.every((r) => r.user_id === priya.id), JSON.stringify(others));
  const { error: rpcErr } = await priya.c.rpc('saved_item_watchers', { p_item: item.id });
  check("the app can't call saved_item_watchers", Boolean(rpcErr));

  // Hide it from Josh with a group rule: he mustn't be told.
  const { data: g } = await admin.from('friend_groups').insert({ owner_id: sam.id, name: 'Saved check' }).select().single();
  await admin.from('friend_group_members').insert({ group_id: g.id, friend_id: priya.id });
  await admin.from('friend_group_members').insert({ group_id: g.id, friend_id: mei.id });
  await admin.from('item_audience').insert({ item_id: item.id, visibility: 'only', group_ids: [g.id] });

  // ── The function, as the webhook calls it ──
  const call = async (record, old_record) => {
    const res = await fetch(`${API_URL}/functions/v1/push-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'local' },
      body: JSON.stringify({ type: 'UPDATE', table: 'items', schema: 'public', record, old_record }),
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { throw new Error(`function said: ${res.status} ${text}`); }
  };
  const { data: row } = await admin.from('items').select('*').eq('id', item.id).single();
  const back = { ...row, borrowed_by: null, borrowed_date: null, due_date: null, pending_recipient_id: null };
  const msgs = await call(back, { ...row, pending_recipient_id: sam.id });
  const saved = msgs.filter((m) => m.data?.type === 'saved_item_available');
  const to = saved.map((m) => m.to).sort();
  check('returned: only Priya is told', JSON.stringify(to) === JSON.stringify([tokens[priya.id]]), JSON.stringify(to));
  check('...not the borrower who just had it, not Mei (alert off), not Josh (hidden from him)', !to.includes(tokens[borrower]) && !to.includes(tokens[mei.id]) && !to.includes(tokens[josh.id]));
  check('...with the owner and item named', /'s ".+" is free to borrow again\./.test(saved[0]?.body ?? ''), saved[0]?.body);

  const handOn = await call({ ...row, borrowed_by: priya.id, pending_recipient_id: null }, { ...row, pending_recipient_id: priya.id });
  check('handed to the next borrower: nobody told it is free', !handOn.some((m) => m.data?.type === 'saved_item_available'));

  const stillOff = await call({ ...back, is_unavailable: true }, { ...row });
  check('returned but marked unavailable: nobody told', !stillOff.some((m) => m.data?.type === 'saved_item_available'));

  const onAgain = await call({ ...back, is_unavailable: false }, { ...back, is_unavailable: true });
  check('switched back to available: Priya told', onAgain.filter((m) => m.data?.type === 'saved_item_available').map((m) => m.to).join() === tokens[priya.id]);

  const { data: freed } = await admin.from('items').select('id').eq('user_id', sam.id).is('borrowed_by', null).limit(1);
  const plain = await call({ id: freed[0].id, user_id: sam.id, borrowed_by: null, is_unavailable: false, name: 'x' }, { id: freed[0].id, user_id: sam.id, borrowed_by: null, is_unavailable: false });
  check('an unrelated edit: nobody told', plain.length === 0, JSON.stringify(plain));
} finally {
  await cleanup();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
