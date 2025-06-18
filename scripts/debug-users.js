const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUsers() {
  console.log('🔍 Debugging user table issues...');
  
  try {
    // Check if profiles table exists and its structure
    console.log('\n📋 Checking profiles table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'profiles' })
      .single();
    
    if (tableError) {
      console.log('⚠️  Could not get table info (this is normal):', tableError.message);
    }
    
    // Try to get users with service role (bypasses RLS)
    console.log('\n👥 Checking users in profiles table...');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*');
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message);
      
      // Check if table exists at all
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'profiles');
      
      if (tablesError) {
        console.log('❌ Error checking table existence:', tablesError.message);
      } else if (!tables || tables.length === 0) {
        console.log('❌ Profiles table does not exist!');
        console.log('🔧 Creating profiles table...');
        
        // Create the profiles table
        const { error: createError } = await supabase.rpc('exec', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.profiles (
              id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
              full_name TEXT,
              email TEXT,
              is_premium BOOLEAN DEFAULT FALSE,
              user_tier TEXT DEFAULT 'free',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });
        
        if (createError) {
          console.log('❌ Error creating profiles table:', createError.message);
        } else {
          console.log('✅ Profiles table created');
        }
      } else {
        console.log('✅ Profiles table exists');
      }
    } else {
      console.log(`✅ Found ${users.length} users in profiles table`);
      users.forEach(user => {
        console.log(`  - ${user.full_name || 'Unknown'} (${user.email || 'No email'}): ${user.user_tier || 'No tier'}`);
      });
    }
    
    // Check auth.users table
    console.log('\n🔐 Checking auth.users table...');
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, created_at');
    
    if (authError) {
      console.log('❌ Cannot access auth.users directly:', authError.message);
      console.log('ℹ️  This is normal - auth.users is protected');
    } else {
      console.log(`✅ Found ${authUsers.length} users in auth.users`);
    }
    
    // Create test users if profiles table is empty
    if (!users || users.length === 0) {
      console.log('\n🧪 Creating test users for development...');
      
      const testUsers = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          full_name: 'Test User 1',
          email: 'test1@example.com',
          user_tier: 'free',
          is_premium: false
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          full_name: 'Test User 2',
          email: 'test2@example.com',
          user_tier: 'premium',
          is_premium: true
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          full_name: 'Admin User',
          email: 'vidmase@gmail.com',
          user_tier: 'admin',
          is_premium: true
        }
      ];
      
      const { data: createdUsers, error: createUsersError } = await supabase
        .from('profiles')
        .insert(testUsers)
        .select();
      
      if (createUsersError) {
        console.log('❌ Error creating test users:', createUsersError.message);
      } else {
        console.log(`✅ Created ${createdUsers.length} test users`);
        createdUsers.forEach(user => {
          console.log(`  - ${user.full_name} (${user.email}): ${user.user_tier}`);
        });
      }
    }
    
    // Final check
    console.log('\n🔍 Final user count check...');
    const { data: finalUsers, error: finalError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_tier, is_premium');
    
    if (finalError) {
      console.log('❌ Final check error:', finalError.message);
    } else {
      console.log(`🎉 Total users in system: ${finalUsers.length}`);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

debugUsers(); 