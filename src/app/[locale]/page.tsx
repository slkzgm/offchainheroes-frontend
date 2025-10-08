import { Suspense } from 'react'
import ThemeSwitcher from '@/components/theme-switcher'
import LanguageSwitcher from '@/components/language-switcher'
import LandingAuthPanel from '@/components/landing-auth-panel'
import { createTranslator, defaultLocale, getMessages, isLocale, locales, type Locale } from '@/i18n'

type LocaleSegment = { locale?: string | string[] }
type LocaleParams = Promise<LocaleSegment>

function normalizeLocale(value?: string): Locale {
  if (!value) return defaultLocale
  return isLocale(value) ? value : defaultLocale
}

function extractLocale(value?: string | string[]): string | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

async function resolveLocale(params?: LocaleParams): Promise<Locale> {
  const localeSegment = params ? await params : undefined
  const localeParam = extractLocale(localeSegment?.locale)
  return normalizeLocale(localeParam)
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function Home({ params }: { params?: LocaleParams }) {
  const locale = await resolveLocale(params)
  const messages = await getMessages(locale)
  const t = createTranslator(messages)

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-12 px-6 py-16">
      <header className="flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight">{t('common.appName')}</div>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
          <ThemeSwitcher />
        </div>
      </header>
      <LandingAuthPanel />
    </main>
  )
}
