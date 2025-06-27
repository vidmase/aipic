const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populateAdminData() {
  console.log('🚀 Populating admin system data...');
  
  try {
    // Check current users
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_tier, is_premium');
    
    console.log('👥 Current users:', users?.length || 0);
    if (users) {
      users.forEach(user => {
        console.log(`  - ${user.full_name || 'Unknown'} (${user.email || 'No email'}): ${user.user_tier || 'No tier'}`);
      });
    }
    
    // Check and populate image models
    const { data: existingModels } = await supabase
      .from('image_models')
      .select('*');
    
    console.log('🤖 Existing models:', existingModels?.length || 0);
    
    if (!existingModels || existingModels.length === 0) {
      console.log('📝 Creating default image models...');
      
      const defaultModels = [
        {
          model_id: 'fal-ai/fast-sdxl',
          display_name: 'Fast SDXL',
          description: 'Fast Stable Diffusion XL model',
          provider: 'fal-ai',
          is_active: true
        },
        {
          model_id: 'fal-ai/flux/schnell',
          display_name: 'Flux Schnell',
          description: 'Fast Flux model for quick generation',
          provider: 'fal-ai',
          is_active: true
        },
        {
          model_id: 'fal-ai/flux/dev',
          display_name: 'Flux Dev',
          description: 'High-quality Flux development model',
          provider: 'fal-ai',
          is_active: true
        },
        {
          model_id: 'fal-ai/ideogram/v2',
          display_name: 'Ideogram v2',
          description: 'Advanced text-to-image model',
          provider: 'fal-ai',
          is_active: true
        },
        {
          model_id: 'fal-ai/bytedance/seededit/v3/edit-image',
          display_name: 'SeedEdit V3',
          description: 'AI-powered image editing with ByteDance SeedEdit',
          provider: 'fal-ai',
          is_active: true
        }
      ];
      
      const { data: createdModels, error: modelError } = await supabase
        .from('image_models')
        .insert(defaultModels)
        .select();
      
      if (modelError) {
        console.log('❌ Error creating models:', modelError.message);
      } else {
        console.log('✅ Created', createdModels?.length || 0, 'models');
      }
    }
    
    // Get tiers and models for access setup
    const { data: tiers } = await supabase.from('user_tiers').select('*');
    const { data: models } = await supabase.from('image_models').select('*');
    
    console.log('🏷️ Tiers:', tiers?.length || 0);
    console.log('🤖 Models:', models?.length || 0);
    
    // Set up tier-model access
    if (tiers && models && tiers.length > 0 && models.length > 0) {
      console.log('🔐 Setting up tier-model access...');
      
      for (const tier of tiers) {
        for (const model of models) {
          // Free tier gets access to basic models only
          const isEnabled = tier.name === 'free' 
            ? ['fal-ai/fast-sdxl', 'fal-ai/ideogram/v2'].includes(model.model_id)
            : true; // Premium and admin get all models
          
          const { error: accessError } = await supabase
            .from('tier_model_access')
            .upsert({
              tier_id: tier.id,
              model_id: model.id,
              is_enabled: isEnabled
            });
          
          if (accessError && !accessError.message.includes('duplicate key')) {
            console.log(`❌ Error setting access for ${tier.name}-${model.model_id}:`, accessError.message);
          }
        }
      }
      console.log('✅ Tier-model access configured');
    }
    
    // Check final state
    const { data: finalAccess } = await supabase
      .from('tier_model_access')
      .select(`
        *,
        user_tiers(name, display_name),
        image_models(model_id, display_name)
      `);
    
    console.log('🔗 Access permissions:', finalAccess?.length || 0);
    if (finalAccess) {
      finalAccess.forEach(access => {
        console.log(`  - ${access.user_tiers.name} → ${access.image_models.model_id}: ${access.is_enabled ? '✅' : '❌'}`);
      });
    }
    
    console.log('🎉 Admin data population complete!');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

populateAdminData(); 