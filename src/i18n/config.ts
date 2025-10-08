export const locales = ['en', 'ko', 'zh', 'ru'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
  zh: '中文',
  ru: 'Русский',
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}
