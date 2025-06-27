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

async function addSeedEditModel() {
  console.log('🚀 Adding SeedEdit V3 model to database...')
  
  try {
    // 1. Add the SeedEdit model to image_models table
    console.log('📝 Adding SeedEdit V3 model...')
    const { data: model, error: modelError } = await supabase
      .from('image_models')
      .upsert({
        model_id: 'fal-ai/bytedance/seededit/v3/edit-image',
        display_name: 'SeedEdit V3',
        description: 'AI-powered image editing with ByteDance SeedEdit',
        provider: 'fal-ai',
        is_active: true,
        default_parameters: {
          guidance_scale: 0.5,
          seed: null
        }
      }, { onConflict: 'model_id' })
      .select()
      .single()

    if (modelError) {
      console.error('❌ Error adding SeedEdit model:', modelError.message)
      return
    }
    console.log('✅ Added SeedEdit V3 model')

    // 2. Get all tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('user_tiers')
      .select('id, name')

    if (tiersError) {
      console.error('❌ Error fetching tiers:', tiersError.message)
      return
    }

    // 3. Set up tier access (premium and admin only, not free)
    console.log('🔐 Setting up tier access permissions...')
    for (const tier of tiers) {
      const isEnabled = tier.name === 'premium' || tier.name === 'admin'
      
      const { error: accessError } = await supabase
        .from('tier_model_access')
        .upsert({
          tier_id: tier.id,
          model_id: model.id,
          is_enabled: isEnabled
        }, { onConflict: 'tier_id,model_id' })

      if (accessError) {
        console.error(`❌ Error setting access for ${tier.name}:`, accessError.message)
      } else {
        console.log(`✅ Set access for ${tier.name}: ${isEnabled ? 'enabled' : 'disabled'}`)
      }
    }

    // 4. Set up quota limits
    console.log('📊 Setting up quota limits...')
    for (const tier of tiers) {
      let dailyLimit, monthlyLimit, hourlyLimit
      
      switch (tier.name) {
        case 'free':
          dailyLimit = 0    // No access for free users
          monthlyLimit = 0
          hourlyLimit = 0
          break
        case 'premium':
          dailyLimit = 50   // Premium users get 50 edits per day
          monthlyLimit = 1500
          hourlyLimit = 5
          break
        case 'admin':
          dailyLimit = 1000  // Admins get high limits
          monthlyLimit = 30000
          hourlyLimit = 100
          break
        default:
          dailyLimit = 0
          monthlyLimit = 0
          hourlyLimit = 0
      }

      const { error: quotaError } = await supabase
        .from('quota_limits')
        .upsert({
          tier_id: tier.id,
          model_id: model.id,
          daily_limit: dailyLimit,
          monthly_limit: monthlyLimit,
          hourly_limit: hourlyLimit
        }, { onConflict: 'tier_id,model_id' })

      if (quotaError) {
        console.error(`❌ Error setting quota for ${tier.name}:`, quotaError.message)
      } else {
        console.log(`✅ Set quota for ${tier.name}: ${dailyLimit} daily, ${monthlyLimit} monthly, ${hourlyLimit} hourly`)
      }
    }

    console.log('🎉 SeedEdit V3 model setup complete!')
    console.log('')
    console.log('📋 Summary:')
    console.log('- Model: fal-ai/bytedance/seededit/v3/edit-image')
    console.log('- Display Name: SeedEdit V3')
    console.log('- Access: Premium and Admin users only')
    console.log('- Free users: No access (0 quota)')
    console.log('- Premium users: 50 daily, 1500 monthly, 5 hourly')
    console.log('- Admin users: 1000 daily, 30000 monthly, 100 hourly')
    console.log('')
    console.log('✨ The SeedEdit V3 model should now appear in your AI Image Studio!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
addSeedEditModel().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
}) 