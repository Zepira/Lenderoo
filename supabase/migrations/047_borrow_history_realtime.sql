-- app/(tabs)/friends/[id].tsx subscribes to postgres_changes on
-- borrow_history (the "History" tab on a friend's detail page), but this
-- table was never added to the supabase_realtime publication — only items,
-- friend_connections, and borrow_requests were (see migration files
-- introducing realtime; borrow_history was added later in 010/consolidated
-- schema without a matching publication update). Every such subscription
-- fails with a channel error, which is the recurring "postgres_changes
-- callback" error users have been hitting since this screen shipped.
alter publication supabase_realtime add table public.borrow_history;
