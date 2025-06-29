#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('📋 Environment check:');
  console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('- ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Missing required environment variables');
    return;
  }
  
  // Validate URL format
  try {
    new URL(supabaseUrl);
    console.log('✅ Supabase URL format is valid');
  } catch (e) {
    console.log('❌ Invalid Supabase URL format:', supabaseUrl);
    return;
  }
  
  // Test connection
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('🔌 Testing connection...');
    
    // Try a simple query to test connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Connection test failed:', error.message);
      console.log('Error details:', error);
    } else {
      console.log('✅ Connection successful!');
      console.log('Data:', data);
    }
    
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

testSupabaseConnection().catch(console.error); 