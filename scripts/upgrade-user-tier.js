#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please check your .env.local file for:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function upgradeUserTier() {
  console.log('🚀 Upgrading user tier to access SeedEdit V3...')
  
  try {
    // Get the email from command line argument or use a default
    const userEmail = process.argv[2]
    
    if (!userEmail) {
      console.error('❌ Please provide user email as argument')
      console.error('Usage: node scripts/upgrade-user-tier.js user@example.com')
      process.exit(1)
    }

    // Find user by email
    console.log(`🔍 Looking for user with email: ${userEmail}`)
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message)
      return
    }

    const user = users.users.find(u => u.email === userEmail)
    if (!user) {
      console.error(`❌ User not found with email: ${userEmail}`)
      return
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`)

    // Check current tier
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_tier, is_premium')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError.message)
      return
    }

    console.log(`📊 Current tier: ${profile?.user_tier || 'free'}`)
    console.log(`💎 Premium status: ${profile?.is_premium || false}`)

    // Upgrade to premium
    console.log('⬆️  Upgrading to premium tier...')
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        user_tier: 'premium',
        is_premium: true
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error upgrading user:', updateError.message)
      return
    }

    console.log('🎉 User tier upgraded successfully!')
    console.log('')
    console.log('📋 Summary:')
    console.log(`- User: ${userEmail}`)
    console.log('- New tier: premium')
    console.log('- Premium status: true')
    console.log('- SeedEdit V3 access: ✅ Enabled')
    console.log('')
    console.log('✨ The user can now access the SeedEdit V3 model!')
    console.log('💡 They may need to refresh the page to see the updated model list.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
upgradeUserTier().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
}) 