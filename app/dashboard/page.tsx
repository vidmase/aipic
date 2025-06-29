import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/signin")
  }

  // Get user's generated images
  const { data: images } = await supabase
    .from("generated_images")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12)

  return <DashboardContent initialImages={images || []} />
}
