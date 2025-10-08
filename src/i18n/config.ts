export const locales = ['en', 'ko'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}
