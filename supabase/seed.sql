-- Demo data for LOCAL Supabase only (store screenshots and demos).
-- Everyone here is made up. Never run this against the hosted project.
--
-- Load: npx supabase db reset   (from the repo root; runs migrations, then this file)
-- Then upload the covers: supabase/demo/upload-covers.sh
-- Sign in as demo@lenderoo.test with the password in the crypt() call below.


-- ── People ──────────────────────────────────────────────────────────────────
create temporary table demo_people (id uuid, email text, name text, avatar text, friend_code text);
insert into demo_people values
  ('00000000-0000-4000-a000-000000000001', 'demo@lenderoo.test',  'Sam Taylor',   'preset:koala',      'SAMT01'),
  ('00000000-0000-4000-a000-000000000002', 'priya@lenderoo.test', 'Priya Nair',   'preset:galah',      'PRIY02'),
  ('00000000-0000-4000-a000-000000000003', 'josh@lenderoo.test',  'Josh Kelly',   'preset:quokka',     'JOSH03'),
  ('00000000-0000-4000-a000-000000000004', 'mei@lenderoo.test',   'Mei Chen',     'preset:cockatoo',   'MEIC04'),
  ('00000000-0000-4000-a000-000000000005', 'tom@lenderoo.test',   'Tom Walsh',    'preset:echidna',    'TOMW05'),
  ('00000000-0000-4000-a000-000000000006', 'ruby@lenderoo.test',  'Ruby Clarke',  'preset:kookaburra', 'RUBY06'),
  ('00000000-0000-4000-a000-000000000007', 'ahmed@lenderoo.test', 'Ahmed Haddad', 'preset:devil',      'AHMD07');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
       crypt('UsErc3IIw9LHvHpsRkNy', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('name', name),
       now() - interval '200 days', now(), '', '', '', ''
from demo_people;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from demo_people;

insert into public.users (id, email, name, avatar_url, friend_code, created_at)
select id, email, name, avatar, friend_code, now() - interval '200 days' from demo_people;

-- Sam is friends with everyone (one active row each way, as approveFriendRequest writes it).
insert into public.friend_connections (user_id, friend_user_id, status, created_at)
select a, b, 'active', now() - interval '120 days'
from (select '00000000-0000-4000-a000-000000000001'::uuid a, id b from demo_people where id <> '00000000-0000-4000-a000-000000000001'
      union all
      select id, '00000000-0000-4000-a000-000000000001'::uuid from demo_people where id <> '00000000-0000-4000-a000-000000000001') pairs;

-- ── Items ───────────────────────────────────────────────────────────────────
-- Covers are made-up books rendered by us (supabase/demo/covers).
create temporary table demo_items (
  id uuid, owner int, name text, category text, cover text, author text,
  borrower int, borrowed_days_ago int, due_in_days int, created_days_ago int
);
insert into demo_items values
  -- Sam's library
  ('00000000-0000-4000-b000-000000000001', 1, 'The Salt Road',           'book',        'salt-road',       'Imogen Hart',    4, 12,   9, 1),
  ('00000000-0000-4000-b000-000000000002', 1, 'Tides of Wattle Bay',     'book',        'wattle-bay',      'Clare Mitchell', null, null, null, 2),
  ('00000000-0000-4000-b000-000000000003', 1, 'Midnight at the Ferry',   'book',        'midnight-ferry',  'J. R. Doyle',    7, 20,  -2, 3),
  ('00000000-0000-4000-b000-000000000004', 1, 'A Small Garden Year',     'book',        'garden-year',     'Lena Fox',       null, null, null, 4),
  ('00000000-0000-4000-b000-000000000005', 1, 'The Last Lighthouse',     'book',        'last-lighthouse', 'Hamish Reid',    null, null, null, 5),
  ('00000000-0000-4000-b000-000000000006', 1, 'Kitchen of Small Things', 'book',        'small-things',    'Ana Moreno',     null, null, null, 6),
  ('00000000-0000-4000-b000-000000000007', 1, 'Cordless drill',          'tool',        null, null,                          3, 5,    2,  90),
  ('00000000-0000-4000-b000-000000000008', 1, 'Hedge trimmer',           'tool',        null, null,                          null, null, null, 85),
  ('00000000-0000-4000-b000-000000000009', 1, '4-person tent',           'sports',      null, null,                          2, 8,   6,  80),
  ('00000000-0000-4000-b000-000000000010', 1, 'Snorkel set',             'sports',      null, null,                          null, null, null, 75),
  ('00000000-0000-4000-b000-000000000011', 1, 'Projector',               'electronics', null, null,                          5, 3,   11, 70),
  ('00000000-0000-4000-b000-000000000012', 1, 'Pasta machine',           'kitchen',     null, null,                          6, 6,   8,  65),
  ('00000000-0000-4000-b000-000000000013', 1, 'Ski jacket',              'clothing',    null, null,                          null, null, null, 60),
  ('00000000-0000-4000-b000-000000000014', 1, 'Picnic set',              'kitchen',     null, null,                          null, null, null, 55),
  -- Friends' things
  ('00000000-0000-4000-b000-000000000021', 4, 'The Quiet Orchard',       'book',        'quiet-orchard',   'Nadia Brooks',   1, 6,   15, 90),
  ('00000000-0000-4000-b000-000000000022', 3, 'Pressure washer',         'tool',        null, null,                          1, 2,   5,  90),
  ('00000000-0000-4000-b000-000000000023', 5, 'Party speaker',           'electronics', null, null,                          1, 4,   3,  90),
  ('00000000-0000-4000-b000-000000000024', 2, 'Red Dirt Summer',         'book',        'red-dirt',        'Callum Byrne',   null, null, null, 90),
  ('00000000-0000-4000-b000-000000000025', 4, 'Camping chairs',          'sports',      null, null,                          5, 4,   10, 90),
  ('00000000-0000-4000-b000-000000000026', 6, 'Stand mixer',             'kitchen',     null, null,                          null, null, null, 90),
  ('00000000-0000-4000-b000-000000000027', 7, 'Board game night box',    'game',        null, null,                          null, null, null, 90);

insert into public.items (id, user_id, name, category, images, metadata, borrowed_by, borrowed_date, due_date, created_at, updated_at)
select i.id,
       ('00000000-0000-4000-a000-00000000000' || i.owner)::uuid,
       i.name, i.category,
       case when i.cover is null then '{}'::text[]
            else array['http://localhost:55321/storage/v1/object/public/item-images/demo/' || i.cover || '.png?v=2'] end,
       case when i.author is null then '{}'::jsonb else jsonb_build_object('author', i.author) end,
       case when i.borrower is null then null else ('00000000-0000-4000-a000-00000000000' || i.borrower)::uuid end,
       case when i.borrower is null then null else now() - make_interval(days => i.borrowed_days_ago) end,
       case when i.borrower is null then null else now() + make_interval(days => i.due_in_days) end,
       now() - make_interval(days => i.created_days_ago), now()
from demo_items i;

-- Book details (made-up synopses) for the detail screen.
update public.items i set metadata = i.metadata || m.meta
from (values
  ('00000000-0000-4000-b000-000000000001'::uuid, '{"condition":"good","genre":"Literary fiction","synopsis":"Two estranged sisters drive the length of the Nullarbor to scatter their father''s ashes, and find the road has its own plans for them."}'::jsonb),
  ('00000000-0000-4000-b000-000000000002', '{"condition":"perfect","genre":"Contemporary","synopsis":"A coastal town, a boarded-up guesthouse and one long summer that changes three families for good."}'),
  ('00000000-0000-4000-b000-000000000003', '{"condition":"good","genre":"Mystery","synopsis":"When the last ferry of the night arrives empty, a retired harbour pilot is the only one who notices who is missing."}'),
  ('00000000-0000-4000-b000-000000000004', '{"condition":"perfect","genre":"Gardening","synopsis":"Twelve months of growing food in a courtyard, a balcony and a borrowed patch of a neighbour''s yard."}'),
  ('00000000-0000-4000-b000-000000000005', '{"condition":"fair","genre":"Historical fiction","synopsis":"1934, a remote island light station, and a keeper''s daughter who refuses to leave when the light is switched off."}'),
  ('00000000-0000-4000-b000-000000000006', '{"condition":"good","genre":"Food writing","synopsis":"Stories and recipes from a tiny kitchen where nothing is wasted and everyone is fed."}'),
  ('00000000-0000-4000-b000-000000000021', '{"condition":"good","genre":"Literary fiction","synopsis":"An orchard that has been in one family for a century, and the summer it might be sold."}'),
  ('00000000-0000-4000-b000-000000000024', '{"condition":"perfect","genre":"Coming of age","synopsis":"A teenager on a cattle station learns more in one dry season than in all her years at school."}')
) as m(id, meta)
where i.id = m.id;

-- Past loans only: history rows are written at return time; the item detail
-- screen draws the current loan from the item itself.
insert into public.borrow_history (item_id, friend_id, borrowed_date, due_date, returned_date, created_at) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002', now() - interval '70 days', now() - interval '50 days', now() - interval '52 days', now() - interval '70 days'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000006', now() - interval '45 days', now() - interval '30 days', now() - interval '31 days', now() - interval '45 days'),
  ('00000000-0000-4000-b000-000000000007', '00000000-0000-4000-a000-000000000005', now() - interval '40 days', now() - interval '33 days', now() - interval '34 days', now() - interval '40 days'),
  ('00000000-0000-4000-b000-000000000009', '00000000-0000-4000-a000-000000000003', now() - interval '60 days', now() - interval '52 days', now() - interval '53 days', now() - interval '60 days'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000004', now() - interval '35 days', now() - interval '20 days', now() - interval '18 days', now() - interval '35 days');

-- ── Requests ────────────────────────────────────────────────────────────────
insert into public.borrow_requests (item_id, requester_id, owner_id, status, message, created_at, updated_at) values
  -- Incoming to Sam
  ('00000000-0000-4000-b000-000000000010', '00000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000001', 'pending', 'Off to Byron next weekend!', now() - interval '3 hours', now() - interval '3 hours'),
  ('00000000-0000-4000-b000-000000000013', '00000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000001', 'pending', 'Thredbo trip in July', now() - interval '1 day', now() - interval '1 day'),
  -- Sam asking friends
  ('00000000-0000-4000-b000-000000000024', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', 'pending', 'Heard this one is great', now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-4000-b000-000000000025', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000004', 'pending', 'For the long weekend', now() - interval '1 day', now() - interval '1 day');

insert into public.item_favourites (item_id, user_id) values
  ('00000000-0000-4000-b000-000000000024', '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000026', '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001');
