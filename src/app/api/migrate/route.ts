import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This is a one-time migration endpoint - DELETE after running
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  // Simple security check
  if (key !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-10)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'public' },
      auth: { persistSession: false }
    }
  )

  const results: { table: string; status: string; error?: string }[] = []

  // Check which tables exist
  const tables = ['courses', 'certificates', 'job_applications', 'career_profiles']

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(0)
    if (error?.code === 'PGRST205' || error?.code === '42P01') {
      results.push({ table, status: 'missing' })
    } else if (!error) {
      results.push({ table, status: 'exists' })
    } else {
      results.push({ table, status: 'error', error: error.message })
    }
  }

  // If tables are missing, provide SQL to run
  const missingTables = results.filter(r => r.status === 'missing').map(r => r.table)

  if (missingTables.length > 0) {
    return NextResponse.json({
      message: 'Tables need to be created. Run the following SQL in Supabase Dashboard > SQL Editor',
      missingTables,
      allResults: results,
      sqlUrl: 'https://supabase.com/dashboard/project/mrmynzeymwgzevxyxnln/sql/new',
      sql: getMigrationSQL()
    })
  }

  return NextResponse.json({
    message: 'All tables exist!',
    results
  })
}

function getMigrationSQL() {
  return `
-- Launch Pad Tables Migration
-- Run this in Supabase Dashboard > SQL Editor

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  institution TEXT DEFAULT 'BYU',
  category TEXT DEFAULT 'required',
  credits INTEGER DEFAULT 3,
  grade TEXT,
  status TEXT DEFAULT 'planned',
  semester TEXT,
  priority INTEGER DEFAULT 0,
  notes TEXT,
  skills TEXT[],
  professor TEXT,
  completion_date DATE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT DEFAULT 'technical',
  status TEXT DEFAULT 'planned',
  cost DECIMAL(10,2),
  estimated_hours INTEGER,
  priority INTEGER DEFAULT 0,
  skills TEXT[],
  credential_id TEXT,
  credential_url TEXT,
  expiration_date DATE,
  completion_date DATE,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Job applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  type TEXT DEFAULT 'full_time',
  location TEXT,
  remote_type TEXT DEFAULT 'on_site',
  salary_min INTEGER,
  salary_max INTEGER,
  status TEXT DEFAULT 'interested',
  applied_date DATE,
  response_date DATE,
  interview_dates TIMESTAMPTZ[],
  offer_deadline DATE,
  job_url TEXT,
  job_description TEXT,
  notes TEXT,
  contacts JSONB,
  priority INTEGER DEFAULT 0,
  is_dream_job BOOLEAN DEFAULT FALSE,
  skills_required TEXT[],
  skills_matched TEXT[],
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Career profile table
CREATE TABLE IF NOT EXISTS career_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  target_role TEXT,
  target_salary INTEGER,
  experience_level TEXT DEFAULT 'student',
  graduation_date DATE,
  university TEXT DEFAULT 'BYU',
  major TEXT,
  minor TEXT,
  gpa DECIMAL(3,2),
  strengths TEXT[],
  interests TEXT[],
  career_path TEXT,
  preferred_companies TEXT[],
  preferred_locations TEXT[],
  willing_to_relocate BOOLEAN DEFAULT TRUE,
  visa_required BOOLEAN DEFAULT FALSE,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_career_profiles_user_id ON career_profiles(user_id);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;

-- Courses policies
DROP POLICY IF EXISTS "Users can view own courses" ON courses;
DROP POLICY IF EXISTS "Users can insert own courses" ON courses;
DROP POLICY IF EXISTS "Users can update own courses" ON courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON courses;
CREATE POLICY "Users can view own courses" ON courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own courses" ON courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON courses FOR DELETE USING (auth.uid() = user_id);

-- Certificates policies
DROP POLICY IF EXISTS "Users can view own certificates" ON certificates;
DROP POLICY IF EXISTS "Users can insert own certificates" ON certificates;
DROP POLICY IF EXISTS "Users can update own certificates" ON certificates;
DROP POLICY IF EXISTS "Users can delete own certificates" ON certificates;
CREATE POLICY "Users can view own certificates" ON certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own certificates" ON certificates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own certificates" ON certificates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own certificates" ON certificates FOR DELETE USING (auth.uid() = user_id);

-- Job applications policies
DROP POLICY IF EXISTS "Users can view own applications" ON job_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON job_applications;
DROP POLICY IF EXISTS "Users can update own applications" ON job_applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON job_applications;
CREATE POLICY "Users can view own applications" ON job_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applications" ON job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON job_applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own applications" ON job_applications FOR DELETE USING (auth.uid() = user_id);

-- Career profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON career_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON career_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON career_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON career_profiles;
CREATE POLICY "Users can view own profile" ON career_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON career_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON career_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON career_profiles FOR DELETE USING (auth.uid() = user_id);

-- Success message
SELECT 'Migration complete! All Launch Pad tables created.' as result;
`
}
