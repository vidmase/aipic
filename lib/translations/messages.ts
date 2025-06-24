import { en } from './en'
import { lt } from './lt'
import type { Locale, Translations } from './index'

export const messages: Translations = {
  en,
  lt
}

export function getMessages(locale: Locale) {
  return messages[locale] || messages.en
}

// Helper function to get nested translation with fallback
export function getNestedMessage(
  messages: any,
  path: string,
  fallback?: string
): string {
  const keys = path.split('.')
  let result = messages
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key]
    } else {
      return fallback || path
    }
  }
  
  return typeof result === 'string' ? result : fallback || path
}

// Format message with variables
export function formatMessage(
  message: string,
  values: Record<string, string | number> = {}
): string {
  return message.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key]?.toString() || match
  })
} 