const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateExistingUsers() {
  console.log('🔄 Updating existing users with tier information...');
  
  try {
    // Update users without user_tier to 'free'
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ 
        user_tier: 'free'
      })
      .is('user_tier', null);
    
    if (error) {
      console.log('❌ Error updating users:', error.message);
    } else {
      console.log('✅ Updated users to free tier');
    }
    
    // Update premium users to have premium tier
    const { data: premiumUpdated, error: premiumError } = await supabase
      .from('profiles')
      .update({ user_tier: 'premium' })
      .eq('is_premium', true);
      
    if (premiumError) {
      console.log('❌ Error updating premium users:', premiumError.message);
    } else {
      console.log('✅ Updated premium users to premium tier');
    }
    
    // Check final count
    const { data: users, error: countError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_tier, is_premium');
      
    if (!countError && users) {
      console.log('📊 Total users:', users.length);
      console.log('📋 User breakdown:');
      users.forEach(user => {
        console.log(`  - ${user.full_name || 'Unknown'} (${user.email}): ${user.user_tier} ${user.is_premium ? '(premium)' : ''}`);
      });
      
      const tierCounts = users.reduce((acc, user) => {
        acc[user.user_tier] = (acc[user.user_tier] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📈 Tier distribution:', tierCounts);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

updateExistingUsers(); 