"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Locale } from '@/lib/translations'
import { defaultLocale, locales } from '@/lib/translations'
import { getMessages, formatMessage, getNestedMessage } from '@/lib/translations/messages'

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  messages: any
  t: (key: string, values?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

interface LocaleProviderProps {
  children: React.ReactNode
  initialLocale?: Locale
}

const LOCALE_STORAGE_KEY = 'aipic-locale'

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Load locale from localStorage
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
    if (savedLocale && locales.includes(savedLocale)) {
      setLocaleState(savedLocale)
    } else {
      // Try to detect browser language
      const browserLocale = navigator.language.split('-')[0] as Locale
      if (locales.includes(browserLocale)) {
        setLocaleState(browserLocale)
      }
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (isClient) {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    }
  }

  const messages = getMessages(locale)

  const t = (key: string, values?: Record<string, string | number>) => {
    const message = getNestedMessage(messages, key, key)
    return values ? formatMessage(message, values) : message
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, messages, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}

export function useTranslation() {
  const { t } = useLocale()
  return { t }
} 