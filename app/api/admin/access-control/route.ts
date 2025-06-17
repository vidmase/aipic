import { createServerClient } from "@/lib/supabase/server"
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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'tiers':
        const { data: tiers } = await supabase
          .from('user_tiers')
          .select('*')
          .order('name')
        return NextResponse.json({ tiers })

      case 'models':
        const { data: models } = await supabase
          .from('image_models')
          .select('*')
          .order('display_name')
        return NextResponse.json({ models })

      case 'access':
        const { data: access } = await supabase
          .from('tier_model_access')
          .select(`
            *,
            user_tiers(name, display_name),
            image_models(model_id, display_name)
          `)
        return NextResponse.json({ access })

      case 'quotas':
        const { data: quotas } = await supabase
          .from('quota_limits')
          .select(`
            *,
            user_tiers(name, display_name),
            image_models(model_id, display_name)
          `)
        return NextResponse.json({ quotas })

      case 'usage':
        const { data: usage } = await supabase
          .from('usage_tracking')
          .select(`
            *,
            profiles(full_name, email),
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
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'update_tier_access': {
        const { tier_id, model_id, is_enabled } = data
        const { error: accessError } = await supabase
          .from('tier_model_access')
          .upsert({
            tier_id,
            model_id,
            is_enabled,
            updated_at: new Date().toISOString()
          })
        
        if (accessError) throw accessError
        return NextResponse.json({ success: true, message: "Access updated successfully" })
      }

      case 'update_quota': {
        const { tier_id: quota_tier_id, model_id: quota_model_id, daily_limit, monthly_limit, hourly_limit } = data
        const { error: quotaError } = await supabase
          .from('quota_limits')
          .upsert({
            tier_id: quota_tier_id,
            model_id: quota_model_id,
            daily_limit,
            monthly_limit,
            hourly_limit,
            updated_at: new Date().toISOString()
          })
        
        if (quotaError) throw quotaError
        return NextResponse.json({ success: true, message: "Quota updated successfully" })
      }

      case 'create_tier': {
        const { name, display_name, description } = data
        const { error: tierError } = await supabase
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
        const { error: modelError } = await supabase
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
        const { user_id, new_tier } = data
        const { error: userError } = await supabase
          .from('profiles')
          .update({
            user_tier: new_tier,
            is_premium: new_tier === 'premium' || new_tier === 'admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', user_id)
        
        if (userError) throw userError
        return NextResponse.json({ success: true, message: "User tier updated successfully" })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Access control API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 