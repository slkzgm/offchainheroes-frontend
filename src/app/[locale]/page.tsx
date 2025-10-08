import ThemeSwitcher from '@/components/theme-switcher'
import LanguageSwitcher from '@/components/language-switcher'
import LandingAuthPanel from '@/components/landing-auth-panel'
import { createTranslator, defaultLocale, getMessages, isLocale, locales, type Locale } from '@/i18n'

type LocaleParams = Promise<{ locale: string }> | { locale: string }

function normalizeLocale(value?: string): Locale {
  if (!value) return defaultLocale
  return isLocale(value) ? value : defaultLocale
}

async function resolveLocale(params: LocaleParams): Promise<Locale> {
  const localeParam = 'then' in params ? (await params).locale : params.locale
  return normalizeLocale(localeParam)
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function Home({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params)
  const messages = await getMessages(locale)
  const t = createTranslator(messages)

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-12 px-6 py-16">
      <header className="flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight">{t('common.appName')}</div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </header>
      <LandingAuthPanel />
    </main>
  )
}
