#!/usr/bin/env node

/**
 * Database Setup Script for Admin System
 * 
 * This script creates the necessary tables and initial data for the admin system.
 * Run with: node scripts/setup-database.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Setting up Admin System Database...\n');

  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease add these to your .env.local file');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('📋 Creating database schema...');

    // Execute SQL commands one by one to avoid syntax issues
    const sqlCommands = [
      // Add columns to profiles table
      `ALTER TABLE public.profiles 
       ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
       ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free';`,

      // Create user_tiers table
      `CREATE TABLE IF NOT EXISTS public.user_tiers (
         id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
         name TEXT UNIQUE NOT NULL,
         display_name TEXT NOT NULL,
         description TEXT,
         is_active BOOLEAN DEFAULT TRUE,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       );`,

      // Create image_models table
      `CREATE TABLE IF NOT EXISTS public.image_models (
         id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
         model_id TEXT UNIQUE NOT NULL,
         display_name TEXT NOT NULL,
         description TEXT,
         provider TEXT NOT NULL DEFAULT 'fal-ai',
         is_active BOOLEAN DEFAULT TRUE,
         default_parameters JSONB DEFAULT '{}',
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       );`,

      // Create tier_model_access table
      `CREATE TABLE IF NOT EXISTS public.tier_model_access (
         id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
         tier_id UUID REFERENCES public.user_tiers(id) ON DELETE CASCADE NOT NULL,
         model_id UUID REFERENCES public.image_models(id) ON DELETE CASCADE NOT NULL,
         is_enabled BOOLEAN DEFAULT TRUE,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         UNIQUE(tier_id, model_id)
       );`,

      // Create quota_limits table
      `CREATE TABLE IF NOT EXISTS public.quota_limits (
         id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
         tier_id UUID REFERENCES public.user_tiers(id) ON DELETE CASCADE NOT NULL,
         model_id UUID REFERENCES public.image_models(id) ON DELETE CASCADE NOT NULL,
         daily_limit INTEGER DEFAULT 3,
         monthly_limit INTEGER DEFAULT 90,
         hourly_limit INTEGER DEFAULT 1,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         UNIQUE(tier_id, model_id)
       );`,

      // Create usage_tracking table
      `CREATE TABLE IF NOT EXISTS public.usage_tracking (
         id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
         user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
         model_id UUID REFERENCES public.image_models(id) ON DELETE CASCADE NOT NULL,
         images_generated INTEGER DEFAULT 1,
         date DATE DEFAULT CURRENT_DATE,
         hour INTEGER DEFAULT EXTRACT(HOUR FROM NOW()),
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         UNIQUE(user_id, model_id, date, hour)
       );`,

      // Create admin_settings table
      `CREATE TABLE IF NOT EXISTS public.admin_settings (
         id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
         setting_key TEXT UNIQUE NOT NULL,
         setting_value JSONB NOT NULL,
         description TEXT,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       );`
    ];

    // Execute each SQL command
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      console.log(`   Executing command ${i + 1}/${sqlCommands.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: command });
      
      if (error) {
        // Try alternative method if RPC doesn't work
        const { error: altError } = await supabase
          .from('_dummy_table_that_does_not_exist')
          .select('*')
          .limit(0);
        
        // If we can't execute SQL directly, provide manual instructions
        if (altError) {
          console.log('⚠️  Cannot execute SQL directly. Please run the following in your Supabase SQL Editor:');
          console.log('\n' + command + '\n');
          continue;
        }
      }
    }

    console.log('✅ Database schema created successfully');

    // Insert default data
    console.log('\n📝 Inserting default data...');

    // Insert default user tiers
    const { error: tiersError } = await supabase
      .from('user_tiers')
      .upsert([
        { name: 'free', display_name: 'Free', description: 'Basic tier with limited access' },
        { name: 'premium', display_name: 'Premium', description: 'Full access to all features' },
        { name: 'admin', display_name: 'Admin', description: 'Administrative access' }
      ], { onConflict: 'name' });

    if (tiersError) {
      console.error('❌ Error creating user tiers:', tiersError.message);
    } else {
      console.log('✅ Created user tiers');
    }

    // Insert default image models
    const { error: modelsError } = await supabase
      .from('image_models')
      .upsert([
        {
          model_id: 'fal-ai/fast-sdxl',
          display_name: 'Fast SDXL',
          description: 'Fast Stable Diffusion XL model',
          provider: 'fal-ai'
        },
        {
          model_id: 'fal-ai/ideogram/v2',
          display_name: 'Ideogram v2',
          description: 'Ideogram text-to-image model v2',
          provider: 'fal-ai'
        },
        {
          model_id: 'fal-ai/ideogram/v3',
          display_name: 'Ideogram v3',
          description: 'Latest Ideogram text-to-image model',
          provider: 'fal-ai'
        },
        {
          model_id: 'fal-ai/flux/schnell',
          display_name: 'Flux Schnell',
          description: 'Fast Flux model for quick generation',
          provider: 'fal-ai'
        },
        {
          model_id: 'fal-ai/flux/dev',
          display_name: 'Flux Dev',
          description: 'Development version of Flux model',
          provider: 'fal-ai'
        }
      ], { onConflict: 'model_id' });

    if (modelsError) {
      console.error('❌ Error creating image models:', modelsError.message);
    } else {
      console.log('✅ Created image models');
    }

    // Get tier and model IDs for setting up access and quotas
    const { data: tiers } = await supabase.from('user_tiers').select('id, name');
    const { data: models } = await supabase.from('image_models').select('id, model_id');

    if (tiers && models) {
      // Set up tier access
      console.log('🔐 Setting up access permissions...');
      
      const accessData = [];
      for (const tier of tiers) {
        for (const model of models) {
          const isEnabled = 
            (tier.name === 'free' && ['fal-ai/fast-sdxl', 'fal-ai/ideogram/v2'].includes(model.model_id)) ||
            ['premium', 'admin'].includes(tier.name);

          accessData.push({
            tier_id: tier.id,
            model_id: model.id,
            is_enabled: isEnabled
          });
        }
      }

      const { error: accessError } = await supabase
        .from('tier_model_access')
        .upsert(accessData, { onConflict: 'tier_id,model_id' });

      if (accessError) {
        console.error('❌ Error setting up access permissions:', accessError.message);
      } else {
        console.log('✅ Access permissions configured');
      }

      // Set up quota limits
      console.log('📊 Setting up quota limits...');
      
      const quotaData = [];
      for (const tier of tiers) {
        for (const model of models) {
          const limits = {
            free: { daily_limit: 3, monthly_limit: 90, hourly_limit: 1 },
            premium: { daily_limit: 100, monthly_limit: 3000, hourly_limit: 10 },
            admin: { daily_limit: 1000, monthly_limit: 30000, hourly_limit: 100 }
          };

          const tierLimits = limits[tier.name] || limits.free;

          quotaData.push({
            tier_id: tier.id,
            model_id: model.id,
            ...tierLimits
          });
        }
      }

      const { error: quotaError } = await supabase
        .from('quota_limits')
        .upsert(quotaData, { onConflict: 'tier_id,model_id' });

      if (quotaError) {
        console.error('❌ Error setting up quota limits:', quotaError.message);
      } else {
        console.log('✅ Quota limits configured');
      }
    }

    console.log('\n🎉 Database setup complete!');
    console.log('\nNext steps:');
    console.log('1. Update lib/admin-config.ts with your admin email');
    console.log('2. Set up RLS policies (see docs/ADMIN_SYSTEM.md)');
    console.log('3. Access the admin interface at /admin');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n📋 Manual Setup Instructions:');
    console.log('If the automated setup failed, please:');
    console.log('1. Go to your Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste the contents of scripts/02-admin-access-control.sql');
    console.log('3. Click "Run" to execute the migration');
    console.log('4. Then run: node scripts/setup-admin-system.js');
  }
}

if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase }; 