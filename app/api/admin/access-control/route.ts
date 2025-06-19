import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server"
import { ADMIN_EMAILS } from "@/lib/admin-config"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
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
    console.error("Access control API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Admin API POST request received')
    
    const supabase = createServerClient()
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
        const { error: modelError } = await adminSupabase
          .from('image_models')
          .insert({
            model_id,
            display_name: model_display_name,
            description: model_description,
            provider,
            is_active: true
          })
        
        if (modelError) throw modelError
        return NextResponse.json({ success: true, message: "Model created successfully" })
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
    const errorDetails: Record<string, any> = {}
    
    if (error && typeof error === 'object') {
      if ('message' in error) errorDetails.message = (error as any).message
      if ('code' in error) errorDetails.code = (error as any).code
      if ('details' in error) errorDetails.details = (error as any).details
      if ('hint' in error) errorDetails.hint = (error as any).hint
    }
    
    console.error("📍 Error details:", errorDetails)
    
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    )
  }
} 