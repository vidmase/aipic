#!/usr/bin/env node

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

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

async function addFluxKontextModel() {
  console.log('🚀 Adding FLUX Kontext Pro model to database...')
  
  try {
    // 1. Add the FLUX Kontext model to image_models table
    console.log('📝 Adding FLUX Kontext Pro model...')
    const { data: model, error: modelError } = await supabase
      .from('image_models')
      .upsert({
        model_id: 'fal-ai/flux-pro/kontext',
        display_name: 'FLUX Kontext Pro',
        description: 'Advanced image editing with FLUX Kontext - handles both text and reference images for targeted edits',
        provider: 'fal-ai',
        is_active: true,
        default_parameters: {
          guidance_scale: 3.5,
          num_inference_steps: 28,
          seed: null
        }
      }, { onConflict: 'model_id' })
      .select()
      .single()

    if (modelError) {
      console.error('❌ Error adding FLUX Kontext model:', modelError.message)
      return
    }
    console.log('✅ Added FLUX Kontext Pro model')

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
      // Only premium and admin tiers get access to FLUX Kontext Pro
      const hasAccess = tier.name === 'premium' || tier.name === 'admin'
      
      const { error: accessError } = await supabase
        .from('tier_model_access')
        .upsert({
          tier_id: tier.id,
          model_id: model.id,
          is_enabled: hasAccess
        }, { onConflict: 'tier_id,model_id' })

      if (accessError) {
        console.error(`❌ Error setting access for ${tier.name}:`, accessError.message)
      } else {
        console.log(`✅ Set access for ${tier.name}: ${hasAccess ? 'enabled' : 'disabled'}`)
      }
    }

    // 4. Set up quota limits
    console.log('📊 Setting up quota limits...')
    for (const tier of tiers) {
      let dailyLimit, monthlyLimit, hourlyLimit
      
      switch (tier.name) {
        case 'free':
          // Free tier gets no access to FLUX Kontext Pro
          dailyLimit = 0
          monthlyLimit = 0
          hourlyLimit = 0
          break
        case 'premium':
          // Premium tier gets generous limits
          dailyLimit = 50
          monthlyLimit = 1000
          hourlyLimit = 10
          break
        case 'admin':
          // Admin gets unlimited access
          dailyLimit = 10000
          monthlyLimit = 100000
          hourlyLimit = 1000
          break
        default:
          // Default fallback
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
        console.log(`✅ Set quota for ${tier.name}: ${dailyLimit}/day, ${monthlyLimit}/month, ${hourlyLimit}/hour`)
      }
    }

    console.log('🎉 Successfully added FLUX Kontext Pro model with permissions and quotas!')
    console.log('📋 Summary:')
    console.log('   - Model: fal-ai/flux-pro/kontext')
    console.log('   - Display Name: FLUX Kontext Pro')
    console.log('   - Available to: Premium and Admin tiers')
    console.log('   - Free tier: No access')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the script
addFluxKontextModel()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 