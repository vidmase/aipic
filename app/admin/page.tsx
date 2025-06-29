import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { ADMIN_EMAILS } from "@/lib/admin-config"

export default async function AdminPage() {
  const supabase = await createServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/signin")
  }

  // Check if user is admin
  if (!ADMIN_EMAILS.includes(user.email || "")) {
    redirect("/dashboard")
  }

  // Fetch users and their statistics
  const { data: users } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      is_premium,
      user_tier,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false })

  // Get image generation counts for each user
  const { data: imageCounts } = await supabase
    .from("generated_images")
    .select("user_id")

  // Process image counts
  const imageCountsByUser = imageCounts?.reduce((acc, img) => {
    acc[img.user_id] = (acc[img.user_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Get recent image counts (last 24h)
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentImages } = await supabase
    .from("generated_images")
    .select("user_id")
    .gte("created_at", since24h)

  const recentImageCountsByUser = recentImages?.reduce((acc, img) => {
    acc[img.user_id] = (acc[img.user_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const usersWithStats = users?.map(user => ({
    ...user,
    totalImages: imageCountsByUser[user.id] || 0,
    recentImages: recentImageCountsByUser[user.id] || 0,
  })) || []

  // Load admin system data using service role client
  const adminSupabase = createServiceRoleClient()
  const [tiersResult, modelsResult, accessResult, quotasResult] = await Promise.all([
    adminSupabase.from('user_tiers').select('*').order('name'),
    adminSupabase.from('image_models').select('*').order('display_name'),
    adminSupabase.from('tier_model_access').select(`
      *,
      user_tiers(name, display_name),
      image_models(model_id, display_name)
    `),
    adminSupabase.from('quota_limits').select(`
      *,
      user_tiers(name, display_name),
      image_models(model_id, display_name)
    `)
  ])

  const adminData = {
    tiers: tiersResult.data || [],
    models: modelsResult.data || [],
    access: accessResult.data || [],
    quotas: quotasResult.data || []
  }

  return (
    <AdminDashboard 
      users={usersWithStats}
      currentAdminEmail={user.email || ""}
      adminData={adminData}
    />
  )
} 