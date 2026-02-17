-- Migration: Borrow Requests System
-- Creates table, indexes, RLS policies, and view for borrow requests

-- Create borrow_requests table
CREATE TABLE IF NOT EXISTS borrow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
    requested_due_date TIMESTAMPTZ,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create partial unique index to prevent duplicate pending requests
-- This prevents the same requester from having multiple pending requests for the same item
CREATE UNIQUE INDEX idx_unique_pending_request
    ON borrow_requests (item_id, requester_id)
    WHERE status = 'pending';

-- Create indexes for common query patterns
CREATE INDEX idx_borrow_requests_item_id ON borrow_requests(item_id);
CREATE INDEX idx_borrow_requests_requester_id ON borrow_requests(requester_id);
CREATE INDEX idx_borrow_requests_owner_id ON borrow_requests(owner_id);
CREATE INDEX idx_borrow_requests_status ON borrow_requests(status);
CREATE INDEX idx_borrow_requests_created_at ON borrow_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view requests they sent (as requester)
CREATE POLICY "Users can view their outgoing requests"
    ON borrow_requests
    FOR SELECT
    USING (auth.uid() = requester_id);

-- Policy: Users can view requests for items they own (as owner)
CREATE POLICY "Users can view their incoming requests"
    ON borrow_requests
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Policy: Users can create requests (as requester)
CREATE POLICY "Users can create borrow requests"
    ON borrow_requests
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- Policy: Requesters can update their own requests (for cancellation)
CREATE POLICY "Requesters can update their requests"
    ON borrow_requests
    FOR UPDATE
    USING (auth.uid() = requester_id);

-- Policy: Owners can update requests for their items (for approval/denial)
CREATE POLICY "Owners can update requests for their items"
    ON borrow_requests
    FOR UPDATE
    USING (auth.uid() = owner_id);

-- Enable realtime for borrow_requests
ALTER PUBLICATION supabase_realtime ADD TABLE borrow_requests;

-- Create view with joined details for easier querying
CREATE OR REPLACE VIEW borrow_requests_with_details AS
SELECT
    br.id,
    br.item_id,
    br.requester_id,
    br.owner_id,
    br.status,
    br.requested_due_date,
    br.message,
    br.created_at,
    br.updated_at,
    -- Item details
    i.name AS item_name,
    i.category AS item_category,
    i.images AS item_images,
    i.borrowed_by AS item_borrowed_by,
    -- Requester details
    ru.name AS requester_name,
    ru.email AS requester_email,
    ru.avatar_url AS requester_avatar_url,
    -- Owner details
    ou.name AS owner_name,
    ou.email AS owner_email
FROM borrow_requests br
JOIN items i ON br.item_id = i.id
JOIN users ru ON br.requester_id = ru.id
JOIN users ou ON br.owner_id = ou.id;

-- Grant access to the view
GRANT SELECT ON borrow_requests_with_details TO authenticated;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_borrow_requests_updated_at
    BEFORE UPDATE ON borrow_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
