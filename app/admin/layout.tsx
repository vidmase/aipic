import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ADMIN_EMAILS } from "@/lib/admin-config"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/signin")
  }

  // Check if user is admin
  if (!ADMIN_EMAILS.includes(user.email || "")) {
    redirect("/dashboard")
  }

  return (
    <div className="admin-layout">
      {children}
    </div>
  )
} 