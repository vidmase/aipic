"use client"

import { SignInForm } from "@/components/auth/signin-form"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { LocaleProvider, useTranslation } from "@/components/providers/locale-provider"

export default function SignInPage() {
  return (
    <LocaleProvider>
      <SignInPageContent />
    </LocaleProvider>
  )
}

function SignInPageContent() {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      {/* Language Switcher - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher variant="ghost" size="sm" />
      </div>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <Sparkles className="w-6 h-6 text-purple-300 group-hover:text-purple-200 transition-colors" />
            <span className="font-space text-lg tracking-[0.2em] bg-gradient-to-r from-purple-300 via-blue-300 to-purple-300 bg-clip-text text-transparent group-hover:from-purple-200 group-hover:via-blue-200 group-hover:to-purple-200 transition-all duration-300">
              {t('header.title')}
            </span>
          </Link>
        </div>
        
        <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl shadow-purple-500/5 border border-white/10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
              {t('auth.signIn.welcomeBack')}
            </h1>
            <p className="text-white/60 font-space">
              {t('auth.signIn.subtitle')}
            </p>
          </div>
          
          <SignInForm />
        </div>
      </div>
    </div>
  )
}
