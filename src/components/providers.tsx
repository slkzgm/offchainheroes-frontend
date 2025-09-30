'use client'

import type { PropsWithChildren } from 'react'
import { ThemeProvider } from '@/components/providers/theme-provider'
import AbstractProvider from '@/components/providers/abstract-provider'
import { QueryProvider } from '@/components/providers/query-provider'

export function Providers({ children }: PropsWithChildren): JSX.Element {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <AbstractProvider>
        <QueryProvider>{children}</QueryProvider>
      </AbstractProvider>
    </ThemeProvider>
  )
}
