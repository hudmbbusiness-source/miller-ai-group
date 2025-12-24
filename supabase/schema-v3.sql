-- Schema V3: Prompt 4 - Resume, Press, Goals, Assets
-- Run this after schema-v2.sql

-- ============================================
-- ACCOMPLISHMENTS / PRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accomplishments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'achievement', -- 'achievement', 'press', 'award', 'publication'
  date DATE,
  link TEXT,
  attachment_url TEXT,
  visible BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for accomplishments
ALTER TABLE accomplishments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view visible accomplishments"
  ON accomplishments FOR SELECT
  USING (visible = true);

CREATE POLICY "Owner can manage accomplishments"
  ON accomplishments FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'short_term', -- 'short_term', 'long_term', 'milestone'
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'abandoned'
  target_date DATE,
  completed_date DATE,
  priority INTEGER DEFAULT 0, -- 0=low, 1=medium, 2=high
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage goals"
  ON goals FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- ASSETS / WANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  external_link TEXT,
  category TEXT DEFAULT 'want', -- 'want', 'owned', 'goal'
  priority INTEGER DEFAULT 0, -- 0=low, 1=medium, 2=high
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage assets"
  ON assets FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- RESUME SUMMARY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS resume_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  summary TEXT,
  headline TEXT,
  location TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for resume_summary
ALTER TABLE resume_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view resume summary"
  ON resume_summary FOR SELECT
  USING (true);

CREATE POLICY "Owner can manage resume summary"
  ON resume_summary FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- UPDATE resume_items categories
-- ============================================
-- Add 'venture' category if not exists
-- ALTER TABLE resume_items
-- ADD CONSTRAINT resume_items_category_check
-- CHECK (category IN ('education', 'startup', 'achievement', 'skill', 'experience', 'certification', 'venture'));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accomplishments_user_visible ON accomplishments(user_id, visible);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_user_category ON assets(user_id, category);
