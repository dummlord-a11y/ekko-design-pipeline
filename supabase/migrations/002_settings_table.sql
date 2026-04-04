-- Settings table for storing OAuth tokens and configuration
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (permissive for internal tool v1)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
