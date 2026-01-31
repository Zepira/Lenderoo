-- Enable Realtime for Friend Connections
-- Allows clients to subscribe to changes in the friend_connections table

-- Enable realtime replication for friend_connections table
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_connections;

-- Note: This enables realtime for the entire table
-- Clients can filter by user_id or friend_user_id on the client side
