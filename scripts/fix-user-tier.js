require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUserTiers() {
  console.log('🔄 Fixing user tiers for premium users...');
  
  try {
    // Find users who have is_premium=true but user_tier='free'
    const { data: premiumUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, is_premium, user_tier')
      .eq('is_premium', true)
      .neq('user_tier', 'premium');
    
    if (fetchError) {
      console.error('❌ Error fetching premium users:', fetchError.message);
      return;
    }
    
    if (!premiumUsers || premiumUsers.length === 0) {
      console.log('✅ No premium users with incorrect tier found');
      return;
    }
    
    console.log(`🔍 Found ${premiumUsers.length} premium users with incorrect tier:`);
    premiumUsers.forEach(user => {
      console.log(`  - ${user.full_name || 'Unknown'} (${user.email}): is_premium=${user.is_premium}, user_tier=${user.user_tier}`);
    });
    
    // Update their user_tier to 'premium'
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ user_tier: 'premium' })
      .eq('is_premium', true)
      .neq('user_tier', 'premium');
    
    if (updateError) {
      console.error('❌ Error updating user tiers:', updateError.message);
      return;
    }
    
    console.log('✅ Successfully updated user tiers');
    
    // Verify the fix
    const { data: verifyUsers, error: verifyError } = await supabase
      .from('profiles')
      .select('id, full_name, email, is_premium, user_tier')
      .eq('is_premium', true);
    
    if (verifyError) {
      console.error('❌ Error verifying users:', verifyError.message);
      return;
    }
    
    console.log('🔍 Current premium users after fix:');
    verifyUsers.forEach(user => {
      console.log(`  - ${user.full_name || 'Unknown'} (${user.email}): is_premium=${user.is_premium}, user_tier=${user.user_tier}`);
    });
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixUserTiers().then(() => {
  console.log('🎉 Script completed');
  process.exit(0);
}); 