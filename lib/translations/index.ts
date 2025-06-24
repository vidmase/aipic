export type Locale = 'en' | 'lt'

export interface TranslationMessages {
  [key: string]: string | TranslationMessages
}

export interface Translations {
  [locale: string]: TranslationMessages
}

export const defaultLocale: Locale = 'en'
export const locales: Locale[] = ['en', 'lt']

export const localeNames: Record<Locale, string> = {
  en: 'English',
  lt: 'Lietuviu'
}

// Alternative display names with special characters
export const localeDisplayNames: Record<Locale, string> = {
  en: 'English',
  lt: 'Lietuvių'
}

// Note: Flag display is now handled in the LanguageSwitcher component with custom designs
export const localeFlags: Record<Locale, string> = {
  en: 'EN',
  lt: 'LT'
} 