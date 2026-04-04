-- Add Gmail OAuth token to designers
ALTER TABLE designers ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT;
ALTER TABLE designers ADD COLUMN IF NOT EXISTS gmail_connected_at TIMESTAMPTZ;
