import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LandingPage } from "@/components/landing-page"

export default async function Home() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  return <LandingPage />
}
