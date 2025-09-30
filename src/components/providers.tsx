'use client'

import type { PropsWithChildren } from 'react'
import { ThemeProvider } from '@/components/providers/theme-provider'
import AbstractProvider from '@/components/providers/abstract-provider'

export function Providers({ children }: PropsWithChildren): JSX.Element {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <AbstractProvider>{children}</AbstractProvider>
    </ThemeProvider>
  )
}
