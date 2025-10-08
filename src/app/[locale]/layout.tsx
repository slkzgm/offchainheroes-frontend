import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/sonner'
import {
  createTranslator,
  defaultLocale,
  getMessages,
  isLocale,
  locales,
  type Locale,
} from '@/i18n'

const SITE_URL = 'https://app.onchainsuperheroes.xyz'

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

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const messages = await getMessages(locale)
  const t = createTranslator(messages)

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('metadata.siteName'),
      template: `%s | ${t('metadata.siteName')}`,
    },
    description: t('metadata.description'),
    applicationName: t('metadata.siteName'),
    authors: [
      {
        name: 'SLKzᵍᵐ',
        url: 'https://github.com/slkzgm',
      },
      {
        name: 'SLKzᵍᵐ',
        url: 'https://slkz.dev/',
      },
    ],
    creator: 'SLKzᵍᵐ',
    keywords: [
      'Onchain Superheroes',
      'Onchain Heroes',
      'automation',
      'web3 gaming',
      'bot dashboard',
      'crypto strategy',
    ],
    openGraph: {
      type: 'website',
      url: SITE_URL,
      siteName: t('metadata.siteName'),
      title: t('metadata.siteName'),
      description: t('metadata.ogDescription'),
      images: [
        {
          url: '/og/social-preview.png',
          width: 1200,
          height: 630,
          alt: t('metadata.ogAlt'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metadata.siteName'),
      description: t('metadata.twitterDescription'),
      creator: '@0xSLK',
      site: '@0xSLK',
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: LocaleParams
}) {
  const locale = await resolveLocale(params)
  const messages = await getMessages(locale)

  return (
    <Providers locale={locale} messages={messages}>
      {children}
      <Toaster />
    </Providers>
  )
}
