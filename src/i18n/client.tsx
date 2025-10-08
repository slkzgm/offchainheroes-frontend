'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import { createTranslator, type Messages, type TranslationKey, type TranslationValues } from './translator'
import { locales, type Locale } from './config'

interface I18nContextValue {
  locale: Locale
  messages: Messages
  t: (key: TranslationKey, values?: TranslationValues) => string
  buildHref: (path: string) => string
  buildHrefForLocale: (targetLocale: Locale, path: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  locale: Locale
  messages: Messages
  children: React.ReactNode
}

function isExternalPath(path: string): boolean {
  return /^(https?:)?\/\//.test(path) || path.startsWith('mailto:') || path.startsWith('tel:')
}

export function I18nProvider({ locale, messages, children }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(() => {
    const translator = createTranslator(messages)

    const buildHref = (path: string) => {
      if (!path) return `/${locale}`
      if (isExternalPath(path) || path.startsWith('#')) return path
      if (!path.startsWith('/')) return path
      if (path.startsWith(`/${locale}`)) return path

      const [pathname, suffix = ''] = path.split(/(?=[?#])/)
      const normalized = pathname.replace(/^\/+/g, '')
      const base = normalized.length > 0 ? `/${locale}/${normalized}` : `/${locale}`
      return `${base}${suffix}`
    }

    const buildHrefForLocale = (targetLocale: Locale, path: string) => {
      if (!path) return `/${targetLocale}`
      if (isExternalPath(path) || path.startsWith('#')) return path
      if (!path.startsWith('/')) return path

      const [pathname, suffix = ''] = path.split(/(?=[?#])/)
      const normalized = pathname.replace(/^\/+/g, '')
      const segments = normalized.split('/')
      const firstSegment = segments[0]
      if (locales.includes(firstSegment as Locale)) {
        segments.shift()
      }
      const base = segments.join('/')
      return `${`/${targetLocale}`}${base.length ? `/${base}` : ''}${suffix}`
    }

    return {
      locale,
      messages,
      t: translator,
      buildHref,
      buildHrefForLocale,
    }
  }, [locale, messages])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export function useTranslate() {
  const { t } = useI18n()
  return t
}

export function useLocaleHref() {
  const { buildHref } = useI18n()
  return buildHref
}

export function useLocale() {
  const { locale } = useI18n()
  return locale
}
