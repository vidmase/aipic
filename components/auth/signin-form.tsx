"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useTranslation } from "@/components/providers/locale-provider"

export function SignInForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      toast({
        title: t('common.success'),
        description: t('auth.signIn.successMessage'),
      })
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder={t('auth.signIn.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/40
              focus:border-purple-500/50 focus:ring-purple-500/30 transition-all duration-200"
          />
        </div>
        <div>
          <Input
            type="password"
            placeholder={t('auth.signIn.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/40
              focus:border-purple-500/50 focus:ring-purple-500/30 transition-all duration-200"
          />
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 text-sm text-center"
        >
          {error}
        </motion.div>
      )}

      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 
            hover:from-purple-600 hover:via-blue-600 hover:to-purple-600
            text-white font-medium tracking-wide transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('auth.signIn.submitButtonLoading') : t('auth.signIn.submitButton')}
        </Button>
      </motion.div>

      <div className="text-center">
        <p className="text-white/60 text-sm">
          {t('auth.signIn.noAccount')}{" "}
          <Link 
            href="/auth/signup" 
            className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            {t('auth.signIn.signUpLink')}
          </Link>
        </p>
      </div>
    </motion.form>
  )
}
