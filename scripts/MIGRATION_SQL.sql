-- Media Asset Library Schema
-- Created: 2025-12-31

-- Media Categories Table
CREATE TABLE IF NOT EXISTS media_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Media Assets Table
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File info
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'media-library',

  -- Media metadata
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document', 'animation', 'svg', 'other')),
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- For video/audio in seconds

  -- Organization
  name TEXT NOT NULL,
  description TEXT,
  alt_text TEXT,
  category_id UUID REFERENCES media_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',

  -- URLs
  public_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_file_type ON media_assets(file_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_category_id ON media_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON media_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_name_search ON media_assets USING GIN(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_media_categories_user_id ON media_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_media_categories_slug ON media_categories(slug);

-- Enable Row Level Security
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_assets
CREATE POLICY "Users can view own media assets" ON media_assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media assets" ON media_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media assets" ON media_assets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media assets" ON media_assets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for media_categories
CREATE POLICY "Users can view own categories" ON media_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON media_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON media_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON media_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Updated at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_media_assets_updated_at ON media_assets;
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_media_categories_updated_at ON media_categories;
CREATE TRIGGER update_media_categories_updated_at
  BEFORE UPDATE ON media_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
-- Note: These will be created per-user when they first access the media library


-- AI Diagnostics System Schema
-- Created: 2025-12-31

-- System Health Snapshots Table
CREATE TABLE IF NOT EXISTS system_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Health data (JSONB for flexibility)
  api_status JSONB NOT NULL DEFAULT '[]',
  database_status JSONB NOT NULL DEFAULT '[]',
  storage_status JSONB NOT NULL DEFAULT '[]',
  env_status JSONB NOT NULL DEFAULT '[]',

  -- Overall health
  overall_status TEXT NOT NULL DEFAULT 'unknown' CHECK (overall_status IN ('healthy', 'degraded', 'critical', 'unknown')),
  issues_count INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,

  -- Performance metrics
  check_duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diagnostic Logs Table
CREATE TABLE IF NOT EXISTS diagnostic_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session tracking
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Diagnostic type
  type TEXT NOT NULL CHECK (type IN ('health_check', 'issue_analysis', 'code_analysis', 'auto_fix', 'rollback')),

  -- Request info
  request_description TEXT,
  request_context JSONB DEFAULT '{}',

  -- Analysis results
  analysis_result JSONB,
  issues_found JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',

  -- Fix proposal and execution
  proposed_fix JSONB,
  fix_description TEXT,
  fix_status TEXT DEFAULT 'pending' CHECK (fix_status IN ('pending', 'approved', 'rejected', 'applied', 'failed', 'rolled_back')),
  fix_applied_at TIMESTAMPTZ,
  fix_result JSONB,

  -- Rollback capability
  rollback_data JSONB,
  can_rollback BOOLEAN DEFAULT false,

  -- AI metadata
  ai_provider TEXT,
  ai_model TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_snapshots_user_id ON system_health_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_created_at ON system_health_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_status ON system_health_snapshots(overall_status);

CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_user_id ON diagnostic_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_session_id ON diagnostic_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_type ON diagnostic_logs(type);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_fix_status ON diagnostic_logs(fix_status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_created_at ON diagnostic_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_health_snapshots
CREATE POLICY "Users can view own health snapshots" ON system_health_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health snapshots" ON system_health_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health snapshots" ON system_health_snapshots
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for diagnostic_logs
CREATE POLICY "Users can view own diagnostic logs" ON diagnostic_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostic logs" ON diagnostic_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diagnostic logs" ON diagnostic_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own diagnostic logs" ON diagnostic_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on diagnostic_logs
DROP TRIGGER IF EXISTS update_diagnostic_logs_updated_at ON diagnostic_logs;
CREATE TRIGGER update_diagnostic_logs_updated_at
  BEFORE UPDATE ON diagnostic_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to clean up old health snapshots (keep last 100)
CREATE OR REPLACE FUNCTION cleanup_old_health_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM system_health_snapshots
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM system_health_snapshots
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-cleanup old snapshots
DROP TRIGGER IF EXISTS cleanup_health_snapshots ON system_health_snapshots;
CREATE TRIGGER cleanup_health_snapshots
  AFTER INSERT ON system_health_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_health_snapshots();
