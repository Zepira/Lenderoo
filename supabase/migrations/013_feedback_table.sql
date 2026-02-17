-- Migration: User Feedback System
-- Creates table for storing user feedback/comments

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    user_email TEXT, -- Store email for easier follow-up
    user_name TEXT, -- Store name for context
    device_platform TEXT, -- iOS, Android, Web
    device_os_version TEXT, -- OS version (e.g., iOS 17.0, Android 13)
    device_model TEXT, -- Device model/brand
    app_version TEXT, -- App version
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create their own feedback
CREATE POLICY "Users can create feedback"
    ON feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
    ON feedback
    FOR SELECT
    USING (auth.uid() = user_id);

-- Note: Admins would need a separate policy to view all feedback
-- This can be added later when you set up admin access
