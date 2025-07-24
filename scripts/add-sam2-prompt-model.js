#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addSAM2PromptModel() {
  try {
    console.log('Adding SAM2 prompting model to database...')

    // Check if model already exists
    const { data: existingModel, error: checkError } = await supabase
      .from('ai_models')
      .select('*')
      .eq('model_id', 'fal-ai/sam2')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existingModel) {
      console.log('SAM2 prompting model already exists, updating it...')
      
      const { error: updateError } = await supabase
        .from('ai_models')
        .update({
          name: 'SAM2 Interactive Segmentation',
          description: 'SAM2 model with point and box prompting for precise object selection',
          type: 'segmentation',
          provider: 'fal-ai',
          is_active: true,
          has_free_tier: true,
          cost_per_use: 0.01,
          max_generations_free: 50,
          max_generations_basic: 200,
          max_generations_premium: 500,
          updated_at: new Date().toISOString()
        })
        .eq('model_id', 'fal-ai/sam2')

      if (updateError) {
        throw updateError
      }

      console.log('SAM2 prompting model updated successfully')
    } else {
      console.log('Creating new SAM2 prompting model...')
      
      const { error: insertError } = await supabase
        .from('ai_models')
        .insert({
          model_id: 'fal-ai/sam2',
          name: 'SAM2 Interactive Segmentation',
          description: 'SAM2 model with point and box prompting for precise object selection',
          type: 'segmentation',
          provider: 'fal-ai',
          is_active: true,
          has_free_tier: true,
          cost_per_use: 0.01,
          max_generations_free: 50,
          max_generations_basic: 200,
          max_generations_premium: 500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        throw insertError
      }

      console.log('SAM2 prompting model added successfully')
    }

    // Remove the old auto-segment model if it exists
    const { data: oldModel, error: oldCheckError } = await supabase
      .from('ai_models')
      .select('*')
      .eq('model_id', 'fal-ai/sam2/auto-segment')
      .single()

    if (!oldCheckError && oldModel) {
      console.log('Removing old SAM2 auto-segment model...')
      
      const { error: deleteError } = await supabase
        .from('ai_models')
        .delete()
        .eq('model_id', 'fal-ai/sam2/auto-segment')

      if (deleteError) {
        console.error('Error removing old model:', deleteError)
      } else {
        console.log('Old SAM2 auto-segment model removed successfully')
      }
    }

    console.log('SAM2 prompting model setup complete!')

  } catch (error) {
    console.error('Error setting up SAM2 prompting model:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  addSAM2PromptModel()
}

module.exports = { addSAM2PromptModel } 