const https = require('https')

const projectRef = 'mrmynzeymwgzevxyxnln'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybXluemV5bXdnemV2eHl4bmxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA1NjEzOSwiZXhwIjoyMDgwNjMyMTM5fQ.YThlzZu_RV49hzncJCIwRh1fgTG9-Vp1bHFm5dZ3E6A'

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

const data = JSON.stringify({ query: sql })

const options = {
  hostname: `${projectRef}.supabase.co`,
  port: 443,
  path: '/rest/v1/rpc/pgtle_admin',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Length': data.length
  }
}

// Try the pg_graphql approach - direct SQL via PostgREST won't work
// Let's use supabase-js to create the table by inserting with service role
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  `https://${projectRef}.supabase.co`,
  supabaseServiceKey,
  {
    db: { schema: 'public' },
    auth: { persistSession: false }
  }
)

async function createTableViaInsert() {
  // First check if table exists by trying to query it
  console.log('Checking if table exists...')
  
  // The service role can bypass RLS, so let's try to create records
  // But first we need the table to exist
  
  // Unfortunately, Supabase REST API cannot create tables directly
  // We need to use the SQL Editor in Dashboard or the Database URL
  
  // Let's check if we have the database URL
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  
  if (dbUrl) {
    console.log('Found database URL, attempting direct connection...')
    const { Client } = require('pg')
    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    await client.query(sql)
    await client.end()
    console.log('Table created successfully!')
  } else {
    console.log('\n=== MANUAL STEP REQUIRED ===')
    console.log('Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new')
    console.log('Paste the following SQL and click Run:\n')
    console.log(sql)
  }
}

createTableViaInsert().catch(err => {
  console.log('Error:', err.message)
  console.log('\n=== MANUAL STEP REQUIRED ===')
  console.log('Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new')
  console.log('And run the SQL to create the table.')
})
