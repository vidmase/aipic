require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupNewModelPermissions() {
  try {
    console.log('🔍 Setting up permissions for new models...');

    // Get all tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('user_tiers')
      .select('*');

    if (tiersError) throw tiersError;

    // Get all models
    const { data: models, error: modelsError } = await supabase
      .from('image_models')
      .select('*');

    if (modelsError) throw modelsError;

    // Get existing tier access records
    const { data: existingAccess, error: accessError } = await supabase
      .from('tier_model_access')
      .select('tier_id, model_id');

    if (accessError) throw accessError;

    // Get existing quota records
    const { data: existingQuotas, error: quotasError } = await supabase
      .from('quota_limits')
      .select('tier_id, model_id');

    if (quotasError) throw quotasError;

    // Create sets for quick lookup
    const existingAccessSet = new Set(
      existingAccess.map(record => `${record.tier_id}-${record.model_id}`)
    );
    const existingQuotasSet = new Set(
      existingQuotas.map(record => `${record.tier_id}-${record.model_id}`)
    );

    // Find missing access records
    const missingAccess = [];
    const missingQuotas = [];

    for (const tier of tiers) {
      for (const model of models) {
        const key = `${tier.id}-${model.id}`;
        
        if (!existingAccessSet.has(key)) {
          missingAccess.push({
            tier_id: tier.id,
            model_id: model.id,
            is_enabled: getDefaultAccess(tier.name, model.model_id)
          });
        }

        if (!existingQuotasSet.has(key)) {
          const quotas = getDefaultQuotas(tier.name, model.model_id);
          missingQuotas.push({
            tier_id: tier.id,
            model_id: model.id,
            ...quotas
          });
        }
      }
    }

    console.log(`📊 Found ${missingAccess.length} missing access records`);
    console.log(`📊 Found ${missingQuotas.length} missing quota records`);

    // Insert missing access records
    if (missingAccess.length > 0) {
      const { error: insertAccessError } = await supabase
        .from('tier_model_access')
        .insert(missingAccess);

      if (insertAccessError) throw insertAccessError;
      console.log(`✅ Created ${missingAccess.length} tier access records`);
    }

    // Insert missing quota records
    if (missingQuotas.length > 0) {
      const { error: insertQuotasError } = await supabase
        .from('quota_limits')
        .insert(missingQuotas);

      if (insertQuotasError) throw insertQuotasError;
      console.log(`✅ Created ${missingQuotas.length} quota limit records`);
    }

    // Log the new models that were set up
    const newModels = models.filter(model => 
      missingAccess.some(access => access.model_id === model.id)
    );

    if (newModels.length > 0) {
      console.log('\n🎉 Set up permissions for new models:');
      newModels.forEach(model => {
        console.log(`   - ${model.display_name} (${model.model_id})`);
      });
    }

    console.log('\n✅ Model permissions setup completed!');

  } catch (error) {
    console.error('❌ Error setting up model permissions:', error);
    process.exit(1);
  }
}

function getDefaultAccess(tierName, modelId) {
  // Default access rules
  switch (tierName) {
    case 'admin':
      return true; // Admin gets access to everything
    case 'premium':
      return true; // Premium gets access to all models
    case 'free':
      // Free tier gets limited access
      if (modelId.includes('fast-sdxl') || 
          modelId.includes('flux/schnell') ||
          modelId.includes('ideogram')) {
        return true;
      }
      // New premium models like Imagen4-Ultra are disabled for free users by default
      return false;
    default:
      return false;
  }
}

function getDefaultQuotas(tierName, modelId) {
  // Default quota rules
  switch (tierName) {
    case 'admin':
      return {
        hourly_limit: 1000,
        daily_limit: 10000,
        monthly_limit: 100000
      };
    case 'premium':
      return {
        hourly_limit: 100,
        daily_limit: 1000,
        monthly_limit: 10000
      };
    case 'free':
      // Different limits for different models
      if (modelId.includes('fast-sdxl')) {
        return {
          hourly_limit: 2,
          daily_limit: 2,
          monthly_limit: 60
        };
      } else if (modelId.includes('flux/schnell')) {
        return {
          hourly_limit: 1,
          daily_limit: 1,
          monthly_limit: 30
        };
      } else {
        // New premium models get very limited free access
        return {
          hourly_limit: 0,
          daily_limit: 0,
          monthly_limit: 0
        };
      }
    default:
      return {
        hourly_limit: 0,
        daily_limit: 0,
        monthly_limit: 0
      };
  }
}

setupNewModelPermissions(); 