-- Launch Pad Enhancement Migration
-- Adds tables for courses, certificates, job applications, and career profile

-- Courses table for tracking BYU and other educational courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT, -- e.g., "CS 142", "IS 410"
  institution TEXT DEFAULT 'BYU',
  category TEXT DEFAULT 'required', -- required, elective, minor, ge
  credits INTEGER DEFAULT 3,
  grade TEXT, -- A, A-, B+, etc.
  status TEXT DEFAULT 'planned', -- planned, in_progress, completed, dropped
  semester TEXT, -- e.g., "Fall 2024", "Winter 2025"
  priority INTEGER DEFAULT 0, -- 0=low, 1=medium, 2=high
  notes TEXT,
  skills TEXT[], -- skills gained from course
  professor TEXT,
  completion_date DATE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Certificates table for professional certifications
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL, -- e.g., "AWS", "Google", "Meta"
  category TEXT DEFAULT 'technical', -- technical, business, design, leadership
  status TEXT DEFAULT 'planned', -- planned, in_progress, completed
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

-- Job applications table for tracking internships and jobs
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  type TEXT DEFAULT 'full_time', -- internship, full_time, part_time, contract
  location TEXT,
  remote_type TEXT DEFAULT 'on_site', -- on_site, hybrid, remote
  salary_min INTEGER,
  salary_max INTEGER,
  status TEXT DEFAULT 'interested', -- interested, applied, phone_screen, interview, offer, accepted, rejected, withdrawn
  applied_date DATE,
  response_date DATE,
  interview_dates TIMESTAMPTZ[],
  offer_deadline DATE,
  job_url TEXT,
  job_description TEXT,
  notes TEXT,
  contacts JSONB, -- array of {name, title, email, linkedin}
  priority INTEGER DEFAULT 0,
  is_dream_job BOOLEAN DEFAULT FALSE,
  skills_required TEXT[],
  skills_matched TEXT[],
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Career profile for storing user preferences and focus
CREATE TABLE IF NOT EXISTS career_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  target_role TEXT, -- e.g., "ML Engineer", "AI Startup Founder"
  target_salary INTEGER,
  experience_level TEXT DEFAULT 'student', -- student, new_grad, mid, senior, lead, executive
  graduation_date DATE,
  university TEXT DEFAULT 'BYU',
  major TEXT,
  minor TEXT,
  gpa DECIMAL(3,2),
  strengths TEXT[], -- e.g., ["entrepreneurship", "AI", "computer science"]
  interests TEXT[],
  career_path TEXT, -- e.g., "ai_ml", "startup_founder", "software_engineering"
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_career_profiles_user_id ON career_profiles(user_id);

-- Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Users can view their own courses" ON courses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own courses" ON courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own courses" ON courses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own courses" ON courses
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for certificates
CREATE POLICY "Users can view their own certificates" ON certificates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own certificates" ON certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own certificates" ON certificates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own certificates" ON certificates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for job_applications
CREATE POLICY "Users can view their own applications" ON job_applications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own applications" ON job_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own applications" ON job_applications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own applications" ON job_applications
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for career_profiles
CREATE POLICY "Users can view their own profile" ON career_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON career_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON career_profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON career_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_career_profiles_updated_at BEFORE UPDATE ON career_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
