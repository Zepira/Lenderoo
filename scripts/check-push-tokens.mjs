// Checks push tokens per device (migration 053) on the LOCAL Supabase stack with the demo seed.
//
//   npx supabase start --exclude logflare,vector,studio && npx supabase db reset
//   printf 'WEBHOOK_SECRET=local\nPUSH_DRY_RUN=1\n' > /tmp/push.env
//   npx supabase functions serve --env-file /tmp/push.env --no-verify-jwt
//   node scripts/check-push-tokens.mjs
//
// Never point this at the hosted project.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(status.API_URL)) throw new Error(`Refusing to run against ${status.API_URL}`);
const PASSWORD = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8').match(/crypt\('([^']+)'/)[1];
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, opts);
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `\n      ${detail}` : ''}`);
  if (!ok) failures++;
};
const signIn = async (email) => {
  const c = createClient(status.API_URL, status.ANON_KEY, opts);
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return { c, id: data.user.id };
};
const sam = await signIn('demo@lenderoo.test');
const priya = await signIn('priya@lenderoo.test');
const PHONE = 'ExponentPushToken[sam-phone]', IPAD = 'ExponentPushToken[sam-ipad]';
const tokensOf = async (id) => ((await admin.rpc('push_tokens_for', { p_users: [id] })).data ?? []).map((r) => r.token).sort();

try {
  await sam.c.rpc('register_push_token', { p_token: PHONE, p_platform: 'ios' });
  await sam.c.rpc('register_push_token', { p_token: IPAD, p_platform: 'ios' });
  check('two devices both registered', JSON.stringify(await tokensOf(sam.id)) === JSON.stringify([IPAD, PHONE].sort()), JSON.stringify(await tokensOf(sam.id)));

  const { error: writeErr } = await priya.c.from('user_push_tokens').insert({ token: 'ExponentPushToken[nope]', user_id: sam.id });
  check("can't write tokens directly", Boolean(writeErr));
  const { data: seen } = await priya.c.from('user_push_tokens').select('token');
  check("can't see other people's tokens", (seen ?? []).every((r) => !r.token.includes('sam')), JSON.stringify(seen));
  const { error: rpcErr } = await priya.c.rpc('push_tokens_for', { p_users: [sam.id] });
  check("the app can't call push_tokens_for", Boolean(rpcErr));

  // Priya signs in on Sam's iPad: the token moves to her.
  await priya.c.rpc('register_push_token', { p_token: IPAD, p_platform: 'ios' });
  check('signing into another account moves the device', !(await tokensOf(sam.id)).includes(IPAD) && (await tokensOf(priya.id)).includes(IPAD));

  // The webhook: a borrow request to Sam reaches his remaining device only.
  const { data: item } = await admin.from('items').select('id').eq('user_id', sam.id).limit(1).single();
  const res = await fetch(`${status.API_URL}/functions/v1/push-notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'local' },
    body: JSON.stringify({ type: 'INSERT', table: 'borrow_requests', schema: 'public', record: { id: '00000000-0000-4000-c000-000000000999', item_id: item.id, requester_id: priya.id, owner_id: sam.id, status: 'pending' }, old_record: null }),
  });
  const msgs = await res.json().catch(async () => { throw new Error(await res.text()); });
  const to = msgs.flatMap((m) => (Array.isArray(m.to) ? m.to : [m.to]));
  check('a new borrow request goes to every device Sam is on', to.includes(PHONE) && !to.includes(IPAD), JSON.stringify(to));

  await sam.c.rpc('register_push_token', { p_token: IPAD, p_platform: 'ios' });
  const both = await (await fetch(`${status.API_URL}/functions/v1/push-notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'local' },
    body: JSON.stringify({ type: 'INSERT', table: 'borrow_requests', schema: 'public', record: { id: '00000000-0000-4000-c000-000000000998', item_id: item.id, requester_id: priya.id, owner_id: sam.id, status: 'pending' }, old_record: null }),
  })).json();
  const to2 = both.flatMap((m) => (Array.isArray(m.to) ? m.to : [m.to])).sort();
  check('...phone and iPad together', JSON.stringify(to2) === JSON.stringify([IPAD, PHONE].sort()), JSON.stringify(to2));

  // Sign out on the phone.
  await sam.c.rpc('unregister_push_token', { p_token: PHONE });
  check('signing out removes that device only', JSON.stringify(await tokensOf(sam.id)) === JSON.stringify([IPAD]), JSON.stringify(await tokensOf(sam.id)));
  const { data: col } = await admin.from('users').select('push_token').eq('id', sam.id).single();
  check('...and from the old column too', col.push_token !== PHONE, col.push_token);
  await priya.c.rpc('unregister_push_token', { p_token: IPAD });
  check("you can't sign someone else's device out", (await tokensOf(sam.id)).includes(IPAD));

  // An older build that only writes the old column still gets pushes.
  await admin.from('users').update({ push_token: 'ExponentPushToken[old-build]' }).eq('id', priya.id);
  check('older builds (old column) still included', (await tokensOf(priya.id)).includes('ExponentPushToken[old-build]'));

  await admin.rpc('forget_push_tokens', { p_tokens: [IPAD, 'ExponentPushToken[old-build]'] });
  check('dead tokens are forgotten everywhere', (await tokensOf(sam.id)).length === 0 && !(await tokensOf(priya.id)).includes('ExponentPushToken[old-build]'));
} finally {
  await admin.from('user_push_tokens').delete().in('user_id', [sam.id, priya.id]);
  await admin.from('users').update({ push_token: null }).in('id', [sam.id, priya.id]);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
