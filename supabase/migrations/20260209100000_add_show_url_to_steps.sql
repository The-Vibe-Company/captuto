-- Add show_url flag to steps table to control URL visibility per step
ALTER TABLE steps ADD COLUMN IF NOT EXISTS show_url BOOLEAN DEFAULT true;
