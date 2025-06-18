require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Checking admin system tables...');
  
  const tables = ['user_tiers', 'image_models', 'tier_model_access', 'quota_limits'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Error accessing ${table}:`, error.message);
      } else {
        console.log(`✅ ${table}: ${count || 0} records`);
      }
    } catch (e) {
      console.log(`❌ Exception accessing ${table}:`, e.message);
    }
  }
  
  // Check tier_model_access with joins
  try {
    const { data: accessData, error: accessError } = await supabase
      .from('tier_model_access')
      .select(`
        *,
        user_tiers(name, display_name),
        image_models(model_id, display_name)
      `)
      .limit(5);
    
    if (accessError) {
      console.log('❌ Error accessing tier_model_access with joins:', accessError.message);
    } else {
      console.log(`✅ tier_model_access with joins: ${accessData?.length || 0} records`);
      if (accessData && accessData.length > 0) {
        console.log('📋 Sample record:', JSON.stringify(accessData[0], null, 2));
      }
    }
  } catch (e) {
    console.log('❌ Exception accessing tier_model_access with joins:', e.message);
  }
  
  // Check individual tables data
  console.log('\n📊 Checking table contents...');
  
  try {
    const { data: tiers } = await supabase.from('user_tiers').select('*').limit(3);
    console.log('🏷️  User tiers:', tiers?.map(t => `${t.name} (${t.display_name})`).join(', '));
  } catch (e) {
    console.log('❌ Error fetching tiers:', e.message);
  }
  
  try {
    const { data: models } = await supabase.from('image_models').select('*').limit(3);
    console.log('🤖 Image models:', models?.map(m => `${m.model_id} (${m.display_name})`).join(', '));
  } catch (e) {
    console.log('❌ Error fetching models:', e.message);
  }
}

checkTables().then(() => {
  console.log('🎉 Check completed');
  process.exit(0);
}).catch(e => {
  console.error('❌ Script error:', e);
  process.exit(1);
}); 