-- Miller AI Group Database Schema
-- Run this script in Supabase SQL Editor

-- ============================================
-- TABLES
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

-- Files Index table (tracks uploaded files metadata)
CREATE TABLE IF NOT EXISTS public.files_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zuckerberg Project Items table (checklist items)
CREATE TABLE IF NOT EXISTS public.z_project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site Content table (editable content for public pages)
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
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes(pinned);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON public.boards(user_id);
CREATE INDEX IF NOT EXISTS idx_pins_board_id ON public.pins(board_id);
CREATE INDEX IF NOT EXISTS idx_pins_user_id ON public.pins(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_links_user_id ON public.saved_links(user_id);
CREATE INDEX IF NOT EXISTS idx_files_index_user_id ON public.files_index(user_id);
CREATE INDEX IF NOT EXISTS idx_z_project_items_user_id ON public.z_project_items(user_id);
CREATE INDEX IF NOT EXISTS idx_z_project_items_section ON public.z_project_items(section);
CREATE INDEX IF NOT EXISTS idx_site_content_key ON public.site_content(key);
CREATE INDEX IF NOT EXISTS idx_site_content_user_id ON public.site_content(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Notes policies
CREATE POLICY "Users can view own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- Boards policies
CREATE POLICY "Users can view own boards"
  ON public.boards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own boards"
  ON public.boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boards"
  ON public.boards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own boards"
  ON public.boards FOR DELETE
  USING (auth.uid() = user_id);

-- Pins policies
CREATE POLICY "Users can view own pins"
  ON public.pins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pins"
  ON public.pins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pins"
  ON public.pins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pins"
  ON public.pins FOR DELETE
  USING (auth.uid() = user_id);

-- Saved Links policies
CREATE POLICY "Users can view own links"
  ON public.saved_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own links"
  ON public.saved_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own links"
  ON public.saved_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own links"
  ON public.saved_links FOR DELETE
  USING (auth.uid() = user_id);

-- Files Index policies
CREATE POLICY "Users can view own files"
  ON public.files_index FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own files"
  ON public.files_index FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON public.files_index FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON public.files_index FOR DELETE
  USING (auth.uid() = user_id);

-- Z Project Items policies
CREATE POLICY "Users can view own z_project_items"
  ON public.z_project_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own z_project_items"
  ON public.z_project_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own z_project_items"
  ON public.z_project_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own z_project_items"
  ON public.z_project_items FOR DELETE
  USING (auth.uid() = user_id);

-- Site Content policies
-- Public read for keys starting with 'public_'
CREATE POLICY "Anyone can read public site content"
  ON public.site_content FOR SELECT
  USING (key LIKE 'public_%');

-- Users can manage their own content
CREATE POLICY "Users can create own site content"
  ON public.site_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own site content"
  ON public.site_content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own site content"
  ON public.site_content FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Note: Run these in the Supabase Dashboard Storage section
-- or use the following SQL (requires service role):

-- Create hudson-files bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hudson-files', 'hudson-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create board-images bucket (private but files can be made public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-images', 'board-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for hudson-files
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hudson-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'hudson-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'hudson-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for board-images (public bucket, user-scoped uploads)
CREATE POLICY "Users can upload board images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'board-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view board images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'board-images');

CREATE POLICY "Users can delete own board images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'board-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DONE
-- ============================================
-- Schema setup complete!
--
-- Next steps:
-- 1. Set up GitHub OAuth in Supabase Auth settings
-- 2. Add your site URL to allowed redirect URLs
-- 3. Configure storage bucket policies if not automatically created
