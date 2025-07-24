#!/usr/bin/env node

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

// Helper function to determine default access based on tier and model
const getDefaultAccess = (tierName, modelId) => {
  if (tierName === 'admin') return true
  if (tierName === 'premium') return true
  if (tierName === 'free') {
    // Free tier gets access to basic models only
    return modelId.includes('fast-sdxl') || 
           modelId.includes('flux/schnell') || 
           modelId.includes('ideogram/v2')
  }
  return false
}

// Helper function to determine default quota limits based on tier and model
const getDefaultQuotas = (tierName, modelId) => {
  const isPremiumModel = modelId.includes('pro') || 
                        modelId.includes('ultra') || 
                        modelId.includes('edit') ||
                        modelId.includes('kontext') ||
                        modelId.includes('seededit')
  
  switch (tierName) {
    case 'free':
      return isPremiumModel 
        ? { daily_limit: 0, monthly_limit: 0, hourly_limit: 0 }
        : { daily_limit: 3, monthly_limit: 90, hourly_limit: 1 }
    case 'premium':
      return isPremiumModel
        ? { daily_limit: 50, monthly_limit: 1500, hourly_limit: 5 }
        : { daily_limit: 100, monthly_limit: 3000, hourly_limit: 10 }
    case 'admin':
      return { daily_limit: 1000, monthly_limit: 30000, hourly_limit: 100 }
    default:
      return { daily_limit: 3, monthly_limit: 90, hourly_limit: 1 }
  }
}

async function fixMissingModelQuotas() {
  console.log('🔧 Fixing missing model quotas and access controls...')
  
  try {
    // Get all models and tiers
    const { data: models, error: modelsError } = await supabase
      .from('image_models')
      .select('id, model_id, display_name')
      .eq('is_active', true)

    if (modelsError) {
      console.error('❌ Error fetching models:', modelsError.message)
      return
    }

    const { data: tiers, error: tiersError } = await supabase
      .from('user_tiers')
      .select('id, name, display_name')

    if (tiersError) {
      console.error('❌ Error fetching tiers:', tiersError.message)
      return
    }

    console.log(`📊 Found ${models.length} models and ${tiers.length} tiers`)

    // Get existing access and quota records
    const { data: existingAccess, error: accessError } = await supabase
      .from('tier_model_access')
      .select('tier_id, model_id')

    const { data: existingQuotas, error: quotasError } = await supabase
      .from('quota_limits')
      .select('tier_id, model_id')

    if (accessError || quotasError) {
      console.error('❌ Error fetching existing records:', accessError || quotasError)
      return
    }

    // Create sets for quick lookup
    const existingAccessSet = new Set(
      existingAccess.map(record => `${record.tier_id}-${record.model_id}`)
    )
    const existingQuotasSet = new Set(
      existingQuotas.map(record => `${record.tier_id}-${record.model_id}`)
    )

    // Find missing records
    const missingAccess = []
    const missingQuotas = []

    for (const model of models) {
      for (const tier of tiers) {
        const accessKey = `${tier.id}-${model.id}`
        const quotaKey = `${tier.id}-${model.id}`

        if (!existingAccessSet.has(accessKey)) {
          missingAccess.push({
            tier_id: tier.id,
            model_id: model.id,
            is_enabled: getDefaultAccess(tier.name, model.model_id)
          })
        }

        if (!existingQuotasSet.has(quotaKey)) {
          const quotas = getDefaultQuotas(tier.name, model.model_id)
          missingQuotas.push({
            tier_id: tier.id,
            model_id: model.id,
            ...quotas
          })
        }
      }
    }

    console.log(`🔍 Found ${missingAccess.length} missing access records`)
    console.log(`🔍 Found ${missingQuotas.length} missing quota records`)

    // Insert missing access records
    if (missingAccess.length > 0) {
      const { error: insertAccessError } = await supabase
        .from('tier_model_access')
        .insert(missingAccess)

      if (insertAccessError) {
        console.error('❌ Error inserting access records:', insertAccessError.message)
      } else {
        console.log(`✅ Created ${missingAccess.length} missing access records`)
      }
    }

    // Insert missing quota records
    if (missingQuotas.length > 0) {
      const { error: insertQuotasError } = await supabase
        .from('quota_limits')
        .insert(missingQuotas)

      if (insertQuotasError) {
        console.error('❌ Error inserting quota records:', insertQuotasError.message)
      } else {
        console.log(`✅ Created ${missingQuotas.length} missing quota records`)
      }
    }

    // Show summary of affected models
    const affectedModels = new Set()
    missingAccess.concat(missingQuotas).forEach(record => {
      const model = models.find(m => m.id === record.model_id)
      if (model) affectedModels.add(model.display_name)
    })

    if (affectedModels.size > 0) {
      console.log('\n🎯 Fixed quota/access settings for these models:')
      affectedModels.forEach(modelName => {
        console.log(`   - ${modelName}`)
      })
    }

    if (missingAccess.length === 0 && missingQuotas.length === 0) {
      console.log('✅ All models already have complete access and quota settings!')
    } else {
      console.log('\n🎉 Successfully fixed missing model quota and access settings!')
    }

  } catch (error) {
    console.error('❌ Script error:', error)
    process.exit(1)
  }
}

// Run the script
fixMissingModelQuotas() 