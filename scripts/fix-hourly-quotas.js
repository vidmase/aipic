#!/usr/bin/env node

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

// Define proper quota limits for each tier and model type
const getProperQuotas = (tierName, modelId) => {
  // Define which models should have premium pricing vs free access
  const freeAccessModels = [
    'fal-ai/fast-sdxl',
    'fal-ai/flux/schnell', 
    'fal-ai/hidream-i1-fast'
  ]
  
  const premiumModels = [
    'fal-ai/flux-pro/v1.1-ultra',
    'fal-ai/flux-pro/kontext',
    'fal-ai/flux-pro/kontext/text-to-image',
    'fal-ai/flux-pro/kontext/max',
    'fal-ai/stable-diffusion-v35-large',
    'fal-ai/imagen4/preview',
    'fal-ai/imagen4/preview/fast',
    'fal-ai/imagen4/preview/ultra',
    'fal-ai/bytedance/seededit/v3/edit-image'
  ]
  
  const standardModels = [
    'fal-ai/flux/dev',
    'fal-ai/ideogram/v2',
    'fal-ai/ideogram/v3',
    'fal-ai/recraft-v3'
  ]
  
  switch (tierName) {
    case 'free':
      if (freeAccessModels.includes(modelId)) {
        return { hourly_limit: 2, daily_limit: 10, monthly_limit: 100 }
      } else {
        // All other models get very limited free access
        return { hourly_limit: 0, daily_limit: 1, monthly_limit: 5 }
      }
      
    case 'premium':
      if (freeAccessModels.includes(modelId)) {
        return { hourly_limit: 20, daily_limit: 100, monthly_limit: 2000 }
      } else if (standardModels.includes(modelId)) {
        return { hourly_limit: 15, daily_limit: 100, monthly_limit: 1500 }
      } else if (premiumModels.includes(modelId)) {
        return { hourly_limit: 10, daily_limit: 50, monthly_limit: 1000 }
      } else {
        return { hourly_limit: 10, daily_limit: 50, monthly_limit: 1000 }
      }
      
    case 'admin':
      return { hourly_limit: 100, daily_limit: 1000, monthly_limit: 10000 }
      
    default:
      return { hourly_limit: 1, daily_limit: 3, monthly_limit: 30 }
  }
}

async function fixHourlyQuotas() {
  console.log('🔧 Fixing hourly quota limits...')
  
  try {
    // Get all current quota limits
    const { data: quotaLimits, error: quotaError } = await supabase
      .from('quota_limits')
      .select(`
        id,
        hourly_limit,
        daily_limit,
        monthly_limit,
        user_tiers!inner(name),
        image_models!inner(model_id, display_name)
      `)

    if (quotaError) {
      console.error('❌ Error fetching quota limits:', quotaError.message)
      return
    }

    console.log(`📊 Found ${quotaLimits.length} quota limit records to review`)
    
    let updatedCount = 0
    let errorCount = 0

    for (const quota of quotaLimits) {
      const tierName = quota.user_tiers.name
      const modelId = quota.image_models.model_id
      const modelName = quota.image_models.display_name
      
      const properQuotas = getProperQuotas(tierName, modelId)
      
      // Check if we need to update this quota
      const needsUpdate = quota.hourly_limit !== properQuotas.hourly_limit ||
                         quota.daily_limit !== properQuotas.daily_limit ||
                         quota.monthly_limit !== properQuotas.monthly_limit

      if (needsUpdate) {
        console.log(`🔄 Updating ${tierName} tier for ${modelName}:`)
        console.log(`   Hourly: ${quota.hourly_limit} → ${properQuotas.hourly_limit}`)
        console.log(`   Daily: ${quota.daily_limit} → ${properQuotas.daily_limit}`)
        console.log(`   Monthly: ${quota.monthly_limit} → ${properQuotas.monthly_limit}`)

        const { error: updateError } = await supabase
          .from('quota_limits')
          .update({
            hourly_limit: properQuotas.hourly_limit,
            daily_limit: properQuotas.daily_limit,
            monthly_limit: properQuotas.monthly_limit,
            updated_at: new Date().toISOString()
          })
          .eq('id', quota.id)

        if (updateError) {
          console.error(`❌ Error updating quota for ${modelName} (${tierName}):`, updateError.message)
          errorCount++
        } else {
          updatedCount++
        }
      } else {
        console.log(`✅ ${tierName} tier for ${modelName} already has correct quotas`)
      }
    }

    console.log(`\n🎉 Quota fix completed!`)
    console.log(`✅ Updated: ${updatedCount} records`)
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} records`)
    }

  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

// Run the fix
fixHourlyQuotas()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 