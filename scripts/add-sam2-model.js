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

async function addSam2Model() {
  console.log('🚀 Adding SAM2 Auto-Segment model to database...')
  
  try {
    // 1. Add the SAM2 model to image_models table
    console.log('📝 Adding SAM2 Auto-Segment model...')
    const { data: model, error: modelError } = await supabase
      .from('image_models')
      .upsert({
        model_id: 'fal-ai/sam2/auto-segment',
        display_name: 'SAM2 Auto-Segment',
        description: 'Automatic object segmentation using Segment Anything Model 2 - detects and segments all objects in an image',
        provider: 'fal-ai',
        is_active: true,
        default_parameters: {
          points_per_side: 32,
          pred_iou_thresh: 0.88,
          stability_score_thresh: 0.95,
          box_nms_thresh: 0.7,
          min_mask_region_area: 0
        }
      }, { onConflict: 'model_id' })
      .select()
      .single()

    if (modelError) {
      console.error('❌ Error adding SAM2 model:', modelError.message)
      return
    }
    console.log('✅ Added SAM2 Auto-Segment model')

    // 2. Get all tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('user_tiers')
      .select('id, name')

    if (tiersError) {
      console.error('❌ Error fetching tiers:', tiersError.message)
      return
    }

    // 3. Set up tier access (all tiers get access to SAM2)
    console.log('🔐 Setting up tier access permissions...')
    for (const tier of tiers) {
      // All tiers get access to SAM2 segmentation
      const hasAccess = true
      
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
          // Free tier gets limited access to SAM2
          dailyLimit = 5
          monthlyLimit = 50
          hourlyLimit = 2
          break
        case 'premium':
          // Premium tier gets generous limits
          dailyLimit = 100
          monthlyLimit = 2000
          hourlyLimit = 20
          break
        case 'admin':
          // Admin gets unlimited access
          dailyLimit = 10000
          monthlyLimit = 100000
          hourlyLimit = 1000
          break
        default:
          // Default fallback
          dailyLimit = 5
          monthlyLimit = 50
          hourlyLimit = 2
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

    console.log('🎉 Successfully added SAM2 Auto-Segment model with permissions and quotas!')
    console.log('📋 Summary:')
    console.log('   - Model: fal-ai/sam2/auto-segment')
    console.log('   - Display Name: SAM2 Auto-Segment')
    console.log('   - Available to: All tiers (with different limits)')
    console.log('   - Free tier: 5/day, Premium: 100/day, Admin: unlimited')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the script
addSam2Model()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 