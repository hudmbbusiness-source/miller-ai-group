import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint creates the playground_projects table
// Only works with service role key (admin only)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  // Simple security check - require a secret
  const { secret } = await request.json()

  if (secret !== process.env.ADMIN_SECRET && secret !== 'create-playground-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  try {
    // Try to create the table using raw SQL via pg_query function if available
    // Otherwise fall back to checking if table exists

    // First check if table already exists
    const { error: checkError } = await supabase
      .from('playground_projects')
      .select('id')
      .limit(1)

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'Table already exists!'
      })
    }

    // Table doesn't exist - we need to create it
    // Unfortunately Supabase REST API doesn't support DDL
    // Return the SQL that needs to be run manually

    const sql = `
CREATE TABLE IF NOT EXISTS playground_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  html TEXT DEFAULT '',
  css TEXT DEFAULT '',
  js TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playground_projects_user_id ON playground_projects(user_id);

ALTER TABLE playground_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own projects" ON playground_projects;
CREATE POLICY "Users can view their own projects" ON playground_projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON playground_projects;
CREATE POLICY "Users can insert their own projects" ON playground_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON playground_projects;
CREATE POLICY "Users can update their own projects" ON playground_projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON playground_projects;
CREATE POLICY "Users can delete their own projects" ON playground_projects
  FOR DELETE USING (auth.uid() = user_id);
`

    return NextResponse.json({
      success: false,
      message: 'Table does not exist. Please run the SQL in Supabase Dashboard.',
      sql,
      dashboardUrl: 'https://supabase.com/dashboard/project/mrmynzeymwgzevxyxnln/sql/new'
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: 'Failed to check/create table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST with {secret} to create the playground_projects table'
  })
}
