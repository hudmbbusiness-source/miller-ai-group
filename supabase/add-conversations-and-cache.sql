-- =============================================================================
-- ADD CONVERSATIONS AND USER CACHE TABLES
-- Run this in Supabase SQL Editor after running FULL_SCHEMA.sql
-- =============================================================================

-- ============================================
-- CONVERSATIONS TABLE (BrainBox AI Chat History)
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can only manage their own conversations
CREATE POLICY "Users can manage own conversations" ON conversations
  FOR ALL USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(user_id, updated_at DESC);

-- ============================================
-- USER CACHE TABLE (General purpose caching)
-- ============================================

CREATE TABLE IF NOT EXISTS user_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cache_key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, cache_key)
);

-- Enable RLS
ALTER TABLE user_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can only manage their own cache
CREATE POLICY "Users can manage own cache" ON user_cache
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_cache_lookup ON user_cache(user_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_user_cache_expiry ON user_cache(expires_at);

-- ============================================
-- STARRED JOBS TABLE (Career Planning)
-- ============================================

CREATE TABLE IF NOT EXISTS starred_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_title TEXT NOT NULL,
  starred_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_title)
);

-- Enable RLS
ALTER TABLE starred_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage starred jobs" ON starred_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_starred_jobs_user ON starred_jobs(user_id);

-- ============================================
-- DONE! New tables created successfully
-- ============================================
