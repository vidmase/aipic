#!/usr/bin/env node

/**
 * Admin System Setup Script
 * 
 * This script helps set up the administrative access control and quota management system.
 * Run with: node scripts/setup-admin-system.js
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupAdminSystem() {
  console.log('🚀 Setting up Admin Access Control & Quota Management System\n');

  // Get Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || await question('Enter your Supabase URL: ');
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || await question('Enter your Supabase Service Role Key: ');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('\n📋 Checking existing schema...');

    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_tiers', 'image_models', 'tier_model_access', 'quota_limits', 'usage_tracking']);

    if (tablesError) {
      console.error('❌ Error checking schema:', tablesError.message);
      return;
    }

    const existingTables = tables.map(t => t.table_name);
    const requiredTables = ['user_tiers', 'image_models', 'tier_model_access', 'quota_limits', 'usage_tracking'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log(`⚠️  Missing tables: ${missingTables.join(', ')}`);
      console.log('Please run the SQL migration script first: scripts/02-admin-access-control.sql');
      return;
    }

    console.log('✅ All required tables exist');

    // Check for existing data
    console.log('\n🔍 Checking existing data...');

    const { data: existingTiers } = await supabase
      .from('user_tiers')
      .select('name')
      .limit(1);

    const { data: existingModels } = await supabase
      .from('image_models')
      .select('model_id')
      .limit(1);

    if (existingTiers?.length > 0 && existingModels?.length > 0) {
      const overwrite = await question('Data already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        return;
      }
    }

    // Set up default data
    console.log('\n🔧 Setting up default configuration...');

    // Default user tiers
    const defaultTiers = [
      { name: 'free', display_name: 'Free', description: 'Basic tier with limited access' },
      { name: 'premium', display_name: 'Premium', description: 'Full access to all features' },
      { name: 'admin', display_name: 'Admin', description: 'Administrative access' }
    ];

    console.log('📝 Creating user tiers...');
    for (const tier of defaultTiers) {
      const { error } = await supabase
        .from('user_tiers')
        .upsert(tier, { onConflict: 'name' });
      
      if (error) {
        console.error(`❌ Error creating tier ${tier.name}:`, error.message);
      } else {
        console.log(`✅ Created tier: ${tier.name}`);
      }
    }

    // Default image models
    const defaultModels = [
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
    ];

    console.log('🤖 Creating image models...');
    for (const model of defaultModels) {
      const { error } = await supabase
        .from('image_models')
        .upsert(model, { onConflict: 'model_id' });
      
      if (error) {
        console.error(`❌ Error creating model ${model.model_id}:`, error.message);
      } else {
        console.log(`✅ Created model: ${model.model_id}`);
      }
    }

    // Set up tier access permissions
    console.log('🔐 Setting up access permissions...');

    const { data: tiers } = await supabase.from('user_tiers').select('id, name');
    const { data: models } = await supabase.from('image_models').select('id, model_id');

    for (const tier of tiers) {
      for (const model of models) {
        const isEnabled = 
          tier.name === 'free' && ['fal-ai/fast-sdxl', 'fal-ai/ideogram/v2'].includes(model.model_id) ||
          ['premium', 'admin'].includes(tier.name);

        const { error } = await supabase
          .from('tier_model_access')
          .upsert({
            tier_id: tier.id,
            model_id: model.id,
            is_enabled: isEnabled
          }, { onConflict: 'tier_id,model_id' });

        if (error) {
          console.error(`❌ Error setting access for ${tier.name}/${model.model_id}:`, error.message);
        }
      }
    }
    console.log('✅ Access permissions configured');

    // Set up quota limits
    console.log('📊 Setting up quota limits...');

    for (const tier of tiers) {
      for (const model of models) {
        const limits = {
          free: { daily_limit: 3, monthly_limit: 90, hourly_limit: 1 },
          premium: { daily_limit: 100, monthly_limit: 3000, hourly_limit: 10 },
          admin: { daily_limit: 1000, monthly_limit: 30000, hourly_limit: 100 }
        };

        const tierLimits = limits[tier.name] || limits.free;

        const { error } = await supabase
          .from('quota_limits')
          .upsert({
            tier_id: tier.id,
            model_id: model.id,
            ...tierLimits
          }, { onConflict: 'tier_id,model_id' });

        if (error) {
          console.error(`❌ Error setting quota for ${tier.name}/${model.model_id}:`, error.message);
        }
      }
    }
    console.log('✅ Quota limits configured');

    // Set up admin user
    const setupAdmin = await question('\n👤 Do you want to set up an admin user? (y/N): ');
    if (setupAdmin.toLowerCase() === 'y') {
      const adminEmail = await question('Enter admin email: ');
      const adminName = await question('Enter admin name (optional): ') || 'Administrator';

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', adminEmail)
        .single();

      if (existingUser) {
        // Update existing user to admin tier
        const { error } = await supabase
          .from('profiles')
          .update({
            user_tier: 'admin',
            is_premium: true,
            full_name: adminName
          })
          .eq('id', existingUser.id);

        if (error) {
          console.error('❌ Error updating admin user:', error.message);
        } else {
          console.log(`✅ Updated ${adminEmail} to admin tier`);
        }
      } else {
        console.log(`⚠️  User ${adminEmail} not found. They need to sign up first, then you can promote them to admin.`);
      }
    }

    console.log('\n🎉 Admin system setup complete!');
    console.log('\nNext steps:');
    console.log('1. Update lib/admin-config.ts with your admin email(s)');
    console.log('2. Update RLS policies in your database with admin emails');
    console.log('3. Access the admin interface at /admin');
    console.log('4. Test the quota system by generating images');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Validation function
async function validateSetup() {
  console.log('\n🔍 Validating setup...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing environment variables');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Test database connection
    const { data, error } = await supabase.from('user_tiers').select('count');
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }

    console.log('✅ Database connection successful');

    // Check for required tables and data
    const checks = [
      { table: 'user_tiers', label: 'User tiers' },
      { table: 'image_models', label: 'Image models' },
      { table: 'tier_model_access', label: 'Access permissions' },
      { table: 'quota_limits', label: 'Quota limits' }
    ];

    for (const check of checks) {
      const { data, error } = await supabase
        .from(check.table)
        .select('id')
        .limit(1);

      if (error || !data || data.length === 0) {
        console.log(`❌ ${check.label} not configured`);
        return false;
      } else {
        console.log(`✅ ${check.label} configured`);
      }
    }

    console.log('\n🎉 Setup validation passed!');
    return true;

  } catch (error) {
    console.log('❌ Validation failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  if (command === 'validate') {
    await validateSetup();
  } else {
    await setupAdminSystem();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupAdminSystem, validateSetup }; 