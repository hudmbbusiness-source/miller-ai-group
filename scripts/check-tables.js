const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\\n|\n/g, '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/\\n|\n/g, '').trim();

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTables() {
  const tables = ['courses', 'certificates', 'job_applications', 'career_profiles'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`\n${table}:`);
    console.log('  data:', data);
    console.log('  error:', error);
  }
}

checkTables().catch(console.error);
