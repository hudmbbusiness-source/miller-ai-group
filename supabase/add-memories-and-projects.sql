-- =============================================================================
-- ADD MEMORIES AND PROJECTS TABLES FOR BRAINBOX
-- Run this in Supabase SQL Editor
-- =============================================================================

-- ============================================
-- USER MEMORIES TABLE (Persistent AI Memory)
-- ============================================

CREATE TABLE IF NOT EXISTS user_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can only manage their own memories
CREATE POLICY "Users can manage own memories" ON user_memories
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_category ON user_memories(user_id, category);

-- ============================================
-- CHAT PROJECTS TABLE (Organize Conversations)
-- ============================================

CREATE TABLE IF NOT EXISTS chat_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#f59e0b',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can only manage their own projects
CREATE POLICY "Users can manage own projects" ON chat_projects
  FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_chat_projects_user_id ON chat_projects(user_id);

-- ============================================
-- ADD PROJECT_ID TO CONVERSATIONS
-- ============================================

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES chat_projects(id) ON DELETE SET NULL;

-- Index for project lookup
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);

-- ============================================
-- DONE! New tables created successfully
-- ============================================
