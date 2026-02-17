-- Migration: Add Device Information to Feedback Table
-- Adds device tracking columns to existing feedback table

-- Add device information columns
ALTER TABLE feedback
ADD COLUMN IF NOT EXISTS device_platform TEXT,
ADD COLUMN IF NOT EXISTS device_os_version TEXT,
ADD COLUMN IF NOT EXISTS device_model TEXT,
ADD COLUMN IF NOT EXISTS app_version TEXT;

-- Add comment for documentation
COMMENT ON COLUMN feedback.device_platform IS 'Platform: ios, android, or web';
COMMENT ON COLUMN feedback.device_os_version IS 'OS version (e.g., iOS 17.0, Android 13)';
COMMENT ON COLUMN feedback.device_model IS 'Device model/brand';
COMMENT ON COLUMN feedback.app_version IS 'App version number';
