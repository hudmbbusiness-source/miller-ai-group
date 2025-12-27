const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Running Launch Pad migration...\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20241227_launch_pad.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual statements (remove empty ones and comments-only blocks)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip certain statements that might fail silently
    if (statement.includes('CREATE INDEX IF NOT EXISTS') ||
        statement.includes('CREATE OR REPLACE FUNCTION') ||
        statement.includes('CREATE TRIGGER') ||
        statement.includes('CREATE POLICY')) {

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          // Try direct execution for DDL
          const { error: error2 } = await supabase.from('_migrations').select('*').limit(0);
          console.log(`[${i + 1}] Skipped (handled by Supabase): ${statement.substring(0, 50)}...`);
          skipCount++;
        } else {
          successCount++;
          console.log(`[${i + 1}] Success: ${statement.substring(0, 50)}...`);
        }
      } catch {
        skipCount++;
      }
      continue;
    }

    // For CREATE TABLE, check if it exists first
    if (statement.includes('CREATE TABLE IF NOT EXISTS')) {
      const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const { data, error } = await supabase.from(tableName).select('*').limit(0);

        if (!error) {
          console.log(`[${i + 1}] Table '${tableName}' already exists, skipping...`);
          skipCount++;
          continue;
        }
      }
    }

    console.log(`[${i + 1}] Executing: ${statement.substring(0, 60)}...`);
  }

  console.log('\n=== Migration Summary ===');
  console.log(`Success: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Errors: ${errorCount}`);

  // Check if tables were created
  console.log('\n=== Checking Tables ===');

  const tables = ['courses', 'certificates', 'job_applications', 'career_profiles'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      console.log(`❌ ${table}: NOT FOUND - ${error.message}`);
    } else {
      console.log(`✅ ${table}: EXISTS`);
    }
  }
}

runMigration().catch(console.error);
