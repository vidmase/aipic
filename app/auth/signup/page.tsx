import { SignUpForm } from "@/components/auth/signup-form"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"
import Link from "next/link"

export default async function SignUpPage() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <Sparkles className="w-6 h-6 text-purple-300 group-hover:text-purple-200 transition-colors" />
            <span className="font-space text-lg tracking-[0.2em] bg-gradient-to-r from-purple-300 via-blue-300 to-purple-300 bg-clip-text text-transparent group-hover:from-purple-200 group-hover:via-blue-200 group-hover:to-purple-200 transition-all duration-300">
              AI IMAGE STUDIO
            </span>
          </Link>
        </div>
        
        <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl shadow-purple-500/5 border border-white/10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
              Create Account
            </h1>
            <p className="text-white/60 font-space">
              Join AI Image Studio and start creating
            </p>
          </div>
          
          <SignUpForm />
        </div>
      </div>
    </div>
  )
}
