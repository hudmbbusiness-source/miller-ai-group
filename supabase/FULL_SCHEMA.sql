-- =============================================================================
-- MILLER AI GROUP - COMPLETE DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor to set up all tables
-- =============================================================================

-- ============================================
-- CORE TABLES
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[],
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Boards table (for Pinterest-style boards)
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pins table (items within boards)
CREATE TABLE IF NOT EXISTS public.pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('link', 'image')),
  title TEXT NOT NULL,
  url TEXT,
  image_path TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved Links table
CREATE TABLE IF NOT EXISTS public.saved_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files Index table
CREATE TABLE IF NOT EXISTS public.files_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zuckerberg Project Items table
CREATE TABLE IF NOT EXISTS public.z_project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site Content table
CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(key, user_id)
);

-- ============================================
-- SITE SETTINGS & OWNER
-- ============================================

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  site_name TEXT DEFAULT 'Miller AI Group',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS site_settings_singleton ON site_settings ((true));

-- ============================================
-- RESUME TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS resume_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('education', 'startup', 'achievement', 'skill', 'experience', 'certification')),
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ============================================
-- GOALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'short_term',
  status TEXT DEFAULT 'active',
  target_date DATE,
  completed_date DATE,
  priority INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ASSETS / WISHLIST TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  external_link TEXT,
  category TEXT DEFAULT 'want',
  priority INTEGER DEFAULT 0,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACCOMPLISHMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS accomplishments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'achievement',
  date DATE,
  link TEXT,
  attachment_url TEXT,
  visible BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  status TEXT CHECK (status IN ('not_connected', 'in_development', 'live', 'paused', 'archived')) DEFAULT 'not_connected',
  is_featured BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BUSINESS CARD SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS business_card_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT DEFAULT 'Hudson Barnes',
  title TEXT DEFAULT 'Founder | Innovator',
  company TEXT DEFAULT 'Miller AI Group',
  email TEXT,
  phone TEXT,
  website TEXT DEFAULT 'kachow.app',
  linkedin_url TEXT,
  instagram_url TEXT,
  github_url TEXT,
  tagline TEXT,
  show_projects BOOLEAN DEFAULT TRUE,
  projects_to_show TEXT[] DEFAULT ARRAY['kachow', 'stuntman', 'brainbox'],
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE accomplishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_card_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Notes
CREATE POLICY "Users can manage own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- Boards
CREATE POLICY "Users can manage own boards" ON public.boards FOR ALL USING (auth.uid() = user_id);

-- Pins
CREATE POLICY "Users can manage own pins" ON public.pins FOR ALL USING (auth.uid() = user_id);

-- Saved Links
CREATE POLICY "Users can manage own links" ON public.saved_links FOR ALL USING (auth.uid() = user_id);

-- Files Index
CREATE POLICY "Users can manage own files" ON public.files_index FOR ALL USING (auth.uid() = user_id);

-- Z Project Items
CREATE POLICY "Users can manage own z_project_items" ON public.z_project_items FOR ALL USING (auth.uid() = user_id);

-- Site Content
CREATE POLICY "Anyone can read public site content" ON public.site_content FOR SELECT USING (key LIKE 'public_%');
CREATE POLICY "Users can manage own site content" ON public.site_content FOR ALL USING (auth.uid() = user_id);

-- Site Settings
CREATE POLICY "Authenticated users can read site settings" ON site_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can update site settings" ON site_settings FOR UPDATE TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "First user becomes owner" ON site_settings FOR INSERT TO authenticated WITH CHECK (NOT EXISTS (SELECT 1 FROM site_settings));

-- Resume Items
CREATE POLICY "Public can read visible resume items" ON resume_items FOR SELECT USING (visible = true);
CREATE POLICY "Owner can manage resume items" ON resume_items FOR ALL TO authenticated USING (user_id = auth.uid());

-- Resume Summary
CREATE POLICY "Public can view resume summary" ON resume_summary FOR SELECT USING (true);
CREATE POLICY "Owner can manage resume summary" ON resume_summary FOR ALL USING (auth.uid() = user_id);

-- Goals
CREATE POLICY "Owner can manage goals" ON goals FOR ALL USING (auth.uid() = user_id);

-- Assets
CREATE POLICY "Owner can manage assets" ON assets FOR ALL USING (auth.uid() = user_id);

-- Accomplishments
CREATE POLICY "Public can view visible accomplishments" ON accomplishments FOR SELECT USING (visible = true);
CREATE POLICY "Owner can manage accomplishments" ON accomplishments FOR ALL USING (auth.uid() = user_id);

-- Projects
CREATE POLICY "Public can read featured projects" ON projects FOR SELECT USING (is_featured = true);
CREATE POLICY "Owner can manage projects" ON projects FOR ALL TO authenticated USING (user_id = auth.uid());

-- Project Links
CREATE POLICY "Public can read project links" ON project_links FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_links.project_id AND projects.is_featured = true));
CREATE POLICY "Owner can manage project links" ON project_links FOR ALL TO authenticated USING (user_id = auth.uid());

-- Business Card Settings
CREATE POLICY "Owner can manage business card" ON business_card_settings FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON public.boards(user_id);
CREATE INDEX IF NOT EXISTS idx_pins_board_id ON public.pins(board_id);
CREATE INDEX IF NOT EXISTS idx_saved_links_user_id ON public.saved_links(user_id);
CREATE INDEX IF NOT EXISTS idx_files_index_user_id ON public.files_index(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_user_category ON assets(user_id, category);
CREATE INDEX IF NOT EXISTS idx_accomplishments_user_visible ON accomplishments(user_id, visible);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('hudson-files', 'hudson-files', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('board-images', 'board-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONE! All tables created successfully
-- ============================================
