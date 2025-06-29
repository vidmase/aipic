import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LandingPage } from "@/components/landing-page"

export default async function Home() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return <LandingPage />
}
