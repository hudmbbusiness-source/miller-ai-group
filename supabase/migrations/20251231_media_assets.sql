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
