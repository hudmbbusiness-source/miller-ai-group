-- =============================================================================
-- EARLY ACCESS SIGNUPS TABLE
-- For Kachow AI early access waitlist
-- =============================================================================

CREATE TABLE IF NOT EXISTS early_access_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  access_code TEXT NOT NULL,
  source TEXT DEFAULT 'instagram',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'converted', 'unsubscribed')),
  ip_address TEXT,
  user_agent TEXT,
  referred_by TEXT,
  notes TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE early_access_signups ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for API routes)
CREATE POLICY "Service role can manage early access"
  ON early_access_signups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read (for admin dashboard)
CREATE POLICY "Authenticated can read early access"
  ON early_access_signups
  FOR SELECT
  TO authenticated
  USING (true);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_early_access_email ON early_access_signups(email);
CREATE INDEX IF NOT EXISTS idx_early_access_code ON early_access_signups(access_code);
CREATE INDEX IF NOT EXISTS idx_early_access_created ON early_access_signups(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_early_access_updated_at
  BEFORE UPDATE ON early_access_signups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
