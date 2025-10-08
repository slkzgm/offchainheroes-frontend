'use client'

import type { PropsWithChildren } from 'react'
import { ThemeProvider } from '@/components/providers/theme-provider'
import AbstractProvider from '@/components/providers/abstract-provider'
import { I18nProvider } from '@/i18n/client'
import type { Locale, Messages } from '@/i18n'

interface ProvidersProps extends PropsWithChildren {
  locale: Locale
  messages: Messages
}

export function Providers({ children, locale, messages }: ProvidersProps) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <AbstractProvider>
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </AbstractProvider>
    </ThemeProvider>
  )
}
