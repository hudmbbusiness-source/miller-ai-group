-- =============================================================================
-- MILLER AI GROUP HUB - SCHEMA V2 (HARDENING & POLISH)
-- Run this AFTER schema.sql from Prompt 1
-- =============================================================================

-- =============================================================================
-- SECTION A: OWNER/ADMIN MODEL
-- =============================================================================

-- Site settings table for owner management
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  site_name TEXT DEFAULT 'Miller AI Group',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only allow one row in site_settings
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_singleton ON site_settings ((true));

-- RLS for site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read site settings
CREATE POLICY "Authenticated users can read site settings"
  ON site_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only owner can update site settings
CREATE POLICY "Owner can update site settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- First user to insert becomes owner (only if empty)
CREATE POLICY "First user becomes owner"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK (NOT EXISTS (SELECT 1 FROM site_settings));

-- =============================================================================
-- SECTION C: RESUME & ACCOMPLISHMENTS
-- =============================================================================

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

-- RLS for resume_items
ALTER TABLE resume_items ENABLE ROW LEVEL SECURITY;

-- Public can read visible resume items (for public resume page)
CREATE POLICY "Public can read visible resume items"
  ON resume_items FOR SELECT
  USING (visible = true);

-- Owner can manage their resume items
CREATE POLICY "Owner can manage resume items"
  ON resume_items FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- SECTION D: PROJECT MANAGEMENT
-- =============================================================================

-- Projects table for private project management
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

-- RLS for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Public can read featured projects
CREATE POLICY "Public can read featured projects"
  ON projects FOR SELECT
  USING (is_featured = true);

-- Owner can manage their projects
CREATE POLICY "Owner can manage projects"
  ON projects FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Project links table
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

-- RLS for project_links
ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;

-- Public can read links for featured projects
CREATE POLICY "Public can read project links"
  ON project_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_links.project_id
      AND projects.is_featured = true
    )
  );

-- Owner can manage their project links
CREATE POLICY "Owner can manage project links"
  ON project_links FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- SECTION E: BUSINESS CARD SETTINGS
-- =============================================================================

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

-- RLS for business_card_settings
ALTER TABLE business_card_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage business card"
  ON business_card_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- ADD CATEGORY COLUMN TO Z_PROJECT_ITEMS (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'z_project_items' AND column_name = 'category'
  ) THEN
    ALTER TABLE z_project_items ADD COLUMN category TEXT;
  END IF;
END $$;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_resume_items_user ON resume_items(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_items_category ON resume_items(category);
CREATE INDEX IF NOT EXISTS idx_resume_items_order ON resume_items(order_index);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_project_links_project ON project_links(project_id);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to new tables
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resume_items_updated_at ON resume_items;
CREATE TRIGGER update_resume_items_updated_at
  BEFORE UPDATE ON resume_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_card_updated_at ON business_card_settings;
CREATE TRIGGER update_business_card_updated_at
  BEFORE UPDATE ON business_card_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DEFAULT CONTENT (if site_content is empty)
-- =============================================================================

INSERT INTO site_content (key, value)
SELECT * FROM (VALUES
  ('public_hero_title', 'Hudson Barnes'),
  ('public_hero_subtitle', 'Building the future with AI'),
  ('public_about_text', 'Entrepreneur, developer, and AI enthusiast. Building innovative solutions at the intersection of technology and business.')
) AS defaults(key, value)
WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE key = defaults.key);
