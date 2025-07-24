import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server"
import { ADMIN_EMAILS } from "@/lib/admin-config"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Use service role client for admin operations
    const adminSupabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'tiers':
        const { data: tiers } = await adminSupabase
          .from('user_tiers')
          .select('*')
          .order('name')
        return NextResponse.json({ tiers })

      case 'models':
        const { data: models } = await adminSupabase
          .from('image_models')
          .select('*')
          .order('display_name')
        return NextResponse.json({ models })

      case 'access':
        const { data: access } = await adminSupabase
          .from('tier_model_access')
          .select(`
            *,
            user_tiers(name, display_name),
            image_models(model_id, display_name)
          `)
        return NextResponse.json({ access })

      case 'quotas':
        const { data: quotas } = await adminSupabase
          .from('quota_limits')
          .select(`
            *,
            user_tiers(name, display_name),
            image_models(model_id, display_name)
          `)
        return NextResponse.json({ quotas })

      case 'usage':
        const { data: usage } = await adminSupabase
          .from('usage_tracking')
          .select(`
            *,
            profiles(full_name),
            image_models(model_id, display_name)
          `)
          .order('created_at', { ascending: false })
          .limit(1000)
        return NextResponse.json({ usage })

      default:
        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 })
    }
  } catch (error) {
    console.error("💥 Access control API error:", error)
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorDetails: Record<string, unknown> = {}
    
    if (error && typeof error === 'object') {
      if ('message' in error) errorDetails.message = (error as {message: unknown}).message
      if ('code' in error) errorDetails.code = (error as {code: unknown}).code
      if ('details' in error) errorDetails.details = (error as {details: unknown}).details
      if ('hint' in error) errorDetails.hint = (error as {hint: unknown}).hint
    }
    
    console.error("📍 Error details:", errorDetails)
    
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Admin API POST request received')
    
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('👤 User authenticated:', user.email)

    if (!ADMIN_EMAILS.includes(user.email || "")) {
      console.log('🚫 User not in admin list:', user.email)
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log('✅ Admin access confirmed')

    // Use service role client for admin operations
    const adminSupabase = createServiceRoleClient()
    const body = await request.json()
    const { action, data } = body
    
    console.log('📝 Action requested:', action)
    console.log('📊 Data payload:', JSON.stringify(data, null, 2))

    switch (action) {
      case 'update_tier_access': {
        console.log('🔄 Updating tier access...')
        const { tier_id, model_id, is_enabled } = data
        console.log('📋 Update data:', { tier_id, model_id, is_enabled })
        
        // First try to update existing record
        const { error: updateError } = await adminSupabase
          .from('tier_model_access')
          .update({ is_enabled })
          .eq('tier_id', tier_id)
          .eq('model_id', model_id)
        
        if (updateError) {
          console.log('❌ Tier access update failed:', updateError)
          throw updateError
        }
        
        console.log('✅ Tier access updated successfully')
        return NextResponse.json({ success: true, message: "Access updated successfully" })
      }

      case 'update_quota': {
        console.log('📊 Updating quota limits...')
        const { tier_id: quota_tier_id, model_id: quota_model_id, daily_limit, monthly_limit, hourly_limit } = data
        console.log('📋 Quota data:', { quota_tier_id, quota_model_id, daily_limit, monthly_limit, hourly_limit })
        
        // Update existing quota record
        const { error: quotaError } = await adminSupabase
          .from('quota_limits')
          .update({
            daily_limit,
            monthly_limit,
            hourly_limit,
            updated_at: new Date().toISOString()
          })
          .eq('tier_id', quota_tier_id)
          .eq('model_id', quota_model_id)
        
        if (quotaError) {
          console.log('❌ Quota update failed:', quotaError)
          throw quotaError
        }
        
        console.log('✅ Quota updated successfully')
        return NextResponse.json({ success: true, message: "Quota updated successfully" })
      }

      case 'create_tier': {
        const { name, display_name, description } = data
        const { error: tierError } = await adminSupabase
          .from('user_tiers')
          .insert({
            name,
            display_name,
            description,
            is_active: true
          })
        
        if (tierError) throw tierError
        return NextResponse.json({ success: true, message: "Tier created successfully" })
      }

      case 'create_model': {
        const { model_id, display_name: model_display_name, description: model_description, provider } = data
        
        // Insert the new model
        const { data: insertedModels, error: modelError } = await adminSupabase
          .from('image_models')
          .insert({
            model_id,
            display_name: model_display_name,
            description: model_description,
            provider,
            is_active: true
          })
          .select()
        
        if (modelError) throw modelError
        const newModel = insertedModels && insertedModels[0]
        if (!newModel) throw new Error('Failed to fetch new model after insert')

        // Fetch all user tiers
        const { data: tiers, error: tiersError } = await adminSupabase
          .from('user_tiers')
          .select('id, name')
        if (tiersError) throw tiersError
        if (!tiers) throw new Error('No user tiers found')

        // Helper function to determine default access based on tier and model
        const getDefaultAccess = (tierName: string, modelId: string) => {
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
        const getDefaultQuotas = (tierName: string, modelId: string) => {
          const isPremiumModel = modelId.includes('pro') || modelId.includes('ultra') || modelId.includes('edit')
          
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

        // Prepare access rows
        const accessRows = tiers.map(tier => ({
          tier_id: tier.id,
          model_id: newModel.id,
          is_enabled: getDefaultAccess(tier.name, model_id)
        }))

        // Prepare quota rows
        const quotaRows = tiers.map(tier => ({
          tier_id: tier.id,
          model_id: newModel.id,
          ...getDefaultQuotas(tier.name, model_id)
        }))

        // Insert access rows
        const { error: accessError } = await adminSupabase
          .from('tier_model_access')
          .insert(accessRows)
        if (accessError) throw accessError

        // Insert quota rows
        const { error: quotaError } = await adminSupabase
          .from('quota_limits')
          .insert(quotaRows)
        if (quotaError) throw quotaError

        return NextResponse.json({ 
          success: true, 
          message: "Model created successfully with tier access and quota limits",
          model: newModel
        })
      }

      case 'sync_missing_quotas': {
        console.log('🔧 Syncing missing quota and access records...')

        // Helper functions (same as in create_model)
        const getDefaultAccess = (tierName: string, modelId: string) => {
          if (tierName === 'admin') return true
          if (tierName === 'premium') return true
          if (tierName === 'free') {
            return modelId.includes('fast-sdxl') || 
                   modelId.includes('flux/schnell') || 
                   modelId.includes('ideogram/v2')
          }
          return false
        }

        const getDefaultQuotas = (tierName: string, modelId: string) => {
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

        // Get all models and tiers
        const [modelsResult, tiersResult] = await Promise.all([
          adminSupabase.from('image_models').select('id, model_id, display_name').eq('is_active', true),
          adminSupabase.from('user_tiers').select('id, name, display_name')
        ])

        if (modelsResult.error) throw modelsResult.error
        if (tiersResult.error) throw tiersResult.error

        const models = modelsResult.data || []
        const tiers = tiersResult.data || []

        // Get existing access and quota records
        const [accessResult, quotasResult] = await Promise.all([
          adminSupabase.from('tier_model_access').select('tier_id, model_id'),
          adminSupabase.from('quota_limits').select('tier_id, model_id')
        ])

        if (accessResult.error) throw accessResult.error
        if (quotasResult.error) throw quotasResult.error

        // Create sets for quick lookup
        const existingAccessSet = new Set(
          (accessResult.data || []).map(record => `${record.tier_id}-${record.model_id}`)
        )
        const existingQuotasSet = new Set(
          (quotasResult.data || []).map(record => `${record.tier_id}-${record.model_id}`)
        )

        // Type definitions for missing records
        interface MissingAccessRecord {
          tier_id: string
          model_id: string
          is_enabled: boolean
        }

        interface MissingQuotaRecord {
          tier_id: string
          model_id: string
          daily_limit: number
        }

        // Find missing records
        const missingAccess: MissingAccessRecord[] = []
        const missingQuotas: MissingQuotaRecord[] = []

        for (const model of models) {
          for (const tier of tiers) {
            const key = `${tier.id}-${model.id}`

            if (!existingAccessSet.has(key)) {
              missingAccess.push({
                tier_id: tier.id,
                model_id: model.id,
                is_enabled: getDefaultAccess(tier.name, model.model_id)
              })
            }

            if (!existingQuotasSet.has(key)) {
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

        // Insert missing records
        const results = {
          accessCreated: 0,
          quotasCreated: 0,
          affectedModels: [] as string[]
        }

        if (missingAccess.length > 0) {
          const { error: accessError } = await adminSupabase
            .from('tier_model_access')
            .insert(missingAccess)
          
          if (accessError) throw accessError
          results.accessCreated = missingAccess.length
        }

        if (missingQuotas.length > 0) {
          const { error: quotaError } = await adminSupabase
            .from('quota_limits')
            .insert(missingQuotas)
          
          if (quotaError) throw quotaError
          results.quotasCreated = missingQuotas.length
        }

        // Get affected models
        const affectedModelIds = new Set()
        const allMissingRecords = [...missingAccess, ...missingQuotas]
        allMissingRecords.forEach(record => {
          affectedModelIds.add(record.model_id)
        })

        results.affectedModels = models.filter(model => 
          affectedModelIds.has(model.id)
        ).map(model => model.display_name)

        console.log('✅ Sync completed successfully')
        return NextResponse.json({ 
          success: true, 
          message: "Missing quota and access records synced successfully",
          results
        })
      }

      case 'update_user_tier': {
        console.log('👤 Updating user tier...')
        const { user_id, new_tier } = data
        console.log('📋 User tier data:', { user_id, new_tier })
        
        const { error: userError } = await adminSupabase
          .from('profiles')
          .update({
            user_tier: new_tier,
            is_premium: new_tier === 'premium' || new_tier === 'admin'
          })
          .eq('id', user_id)
        
        if (userError) {
          console.log('❌ User tier update failed:', userError)
          throw userError
        }
        
        console.log('✅ User tier updated successfully')
        return NextResponse.json({ success: true, message: "User tier updated successfully" })
      }

      default:
        console.log('❓ Unknown action requested:', action)
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("💥 Access control API error:", error)
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorDetails: Record<string, unknown> = {}
    
    if (error && typeof error === 'object') {
      if ('message' in error) errorDetails.message = (error as {message: unknown}).message
      if ('code' in error) errorDetails.code = (error as {code: unknown}).code
      if ('details' in error) errorDetails.details = (error as {details: unknown}).details
      if ('hint' in error) errorDetails.hint = (error as {hint: unknown}).hint
    }
    
    console.error("📍 Error details:", errorDetails)
    
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    )
  }
} 