"use client"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/components/providers/locale-provider"

interface LanguageSwitcherProps {
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg"
}

export function LanguageSwitcher({ 
  variant = "ghost", 
  size = "default"
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale()

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'lt' : 'en')
  }

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={toggleLanguage}
      className="w-12 h-9 p-0 font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 ease-out rounded-lg border-0"
    >
      {locale.toUpperCase()}
    </Button>
  )
} 