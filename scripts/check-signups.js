const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getSignups() {
  const { data, error } = await supabase
    .from('early_access_signups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== KACHOW AI EARLY ACCESS SIGNUPS ===\n');
  console.log('Total Signups:', data.length);
  console.log('');

  data.forEach((signup, i) => {
    console.log(`#${i + 1}: ${signup.email}`);
    console.log(`    Name: ${signup.full_name || 'N/A'}`);
    console.log(`    Code: ${signup.access_code}`);
    console.log(`    Email Sent: ${signup.email_sent ? 'Yes' : 'No'}`);
    console.log(`    Signed Up: ${new Date(signup.created_at).toLocaleString()}`);
    console.log(`    Source: ${signup.source || 'N/A'}`);
    console.log('');
  });
}

getSignups();
