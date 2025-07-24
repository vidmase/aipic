#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

// For local development, use direct environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_url_here'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_service_key_here'

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your_') || supabaseServiceKey.includes('your_')) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  console.error('You can find these in your Supabase dashboard -> Settings -> API')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupSAM2Model() {
  try {
    console.log('Setting up SAM2 model in database...')

    // 1. Add model to image_models table
    console.log('Step 1: Adding SAM2 to image_models table...')
    
    const { data: existingModel, error: checkError } = await supabase
      .from('image_models')
      .select('*')
      .eq('model_id', 'fal-ai/sam2')
      .single()

    let modelUuid
    
    if (checkError && checkError.code === 'PGRST116') {
      // Model doesn't exist, create it
      const { data: newModel, error: insertError } = await supabase
        .from('image_models')
        .insert({
          model_id: 'fal-ai/sam2',
          name: 'SAM2 Interactive Segmentation',
          description: 'SAM2 model with point and box prompting for precise object selection',
          provider: 'fal-ai',
          type: 'segmentation',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }
      
      modelUuid = newModel.id
      console.log('✓ SAM2 model added to image_models')
    } else if (!checkError) {
      modelUuid = existingModel.id
      console.log('✓ SAM2 model already exists in image_models')
    } else {
      throw checkError
    }

    // 2. Get all user tiers
    console.log('Step 2: Setting up tier access for SAM2...')
    
    const { data: userTiers, error: tiersError } = await supabase
      .from('user_tiers')
      .select('id, name')

    if (tiersError) {
      throw tiersError
    }

    // 3. Add tier model access for each tier
    for (const tier of userTiers) {
      const { data: existingAccess, error: accessCheckError } = await supabase
        .from('tier_model_access')
        .select('*')
        .eq('tier_id', tier.id)
        .eq('model_id', modelUuid)
        .single()

      if (accessCheckError && accessCheckError.code === 'PGRST116') {
        // Access doesn't exist, create it
        const { error: accessInsertError } = await supabase
          .from('tier_model_access')
          .insert({
            tier_id: tier.id,
            model_id: modelUuid,
            is_enabled: true,
            created_at: new Date().toISOString()
          })

        if (accessInsertError) {
          console.error(`Error adding access for tier ${tier.name}:`, accessInsertError)
        } else {
          console.log(`✓ Added access for tier: ${tier.name}`)
        }
      } else if (!accessCheckError) {
        console.log(`✓ Access already exists for tier: ${tier.name}`)
      } else {
        console.error(`Error checking access for tier ${tier.name}:`, accessCheckError)
      }
    }

    // 4. Add quota limits for each tier
    console.log('Step 3: Setting up quota limits for SAM2...')
    
    const quotaLimits = {
      'free': { hourly: 5, daily: 20, monthly: 50 },
      'basic': { hourly: 15, daily: 100, monthly: 200 },
      'premium': { hourly: 50, daily: 500, monthly: 1000 }
    }

    for (const tier of userTiers) {
      const limits = quotaLimits[tier.name] || quotaLimits['free']
      
      const { data: existingQuota, error: quotaCheckError } = await supabase
        .from('quota_limits')
        .select('*')
        .eq('tier_id', tier.id)
        .eq('model_id', modelUuid)
        .single()

      if (quotaCheckError && quotaCheckError.code === 'PGRST116') {
        // Quota doesn't exist, create it
        const { error: quotaInsertError } = await supabase
          .from('quota_limits')
          .insert({
            tier_id: tier.id,
            model_id: modelUuid,
            hourly_limit: limits.hourly,
            daily_limit: limits.daily,
            monthly_limit: limits.monthly,
            created_at: new Date().toISOString()
          })

        if (quotaInsertError) {
          console.error(`Error adding quota for tier ${tier.name}:`, quotaInsertError)
        } else {
          console.log(`✓ Added quota limits for tier ${tier.name}: ${limits.daily}/day`)
        }
      } else if (!quotaCheckError) {
        console.log(`✓ Quota limits already exist for tier: ${tier.name}`)
      } else {
        console.error(`Error checking quota for tier ${tier.name}:`, quotaCheckError)
      }
    }

    // 5. Clean up old auto-segment model if it exists
    console.log('Step 4: Cleaning up old SAM2 auto-segment model...')
    
    const { data: oldModel, error: oldCheckError } = await supabase
      .from('image_models')
      .select('id')
      .eq('model_id', 'fal-ai/sam2/auto-segment')
      .single()

    if (!oldCheckError && oldModel) {
      // Delete related records first
      await supabase
        .from('tier_model_access')
        .delete()
        .eq('model_id', oldModel.id)

      await supabase
        .from('quota_limits')
        .delete()
        .eq('model_id', oldModel.id)

      await supabase
        .from('image_models')
        .delete()
        .eq('model_id', 'fal-ai/sam2/auto-segment')

      console.log('✓ Removed old SAM2 auto-segment model')
    } else {
      console.log('✓ No old auto-segment model to clean up')
    }

    console.log('\n🎉 SAM2 model setup complete!')
    console.log('The SAM2 interactive segmentation model is now available with proper quota limits.')

  } catch (error) {
    console.error('❌ Error setting up SAM2 model:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  setupSAM2Model()
}

module.exports = { setupSAM2Model } 