// path: src/components/providers/abstract-provider.tsx
'use client'

import { useState, type ReactNode } from 'react'
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { WagmiProvider } from 'wagmi'
import { createWalletConfig } from '@/lib/wallet-config'
import '@rainbow-me/rainbowkit/styles.css'

const themes = { dark: darkTheme(), light: lightTheme() }

interface AbstractProviderProps {
  children: ReactNode
}

export default function AbstractProvider({ children }: AbstractProviderProps) {
  const [config] = useState(() => createWalletConfig(process.env.NEXT_PUBLIC_REOWN_PROJECT_ID))
  const [queryClient] = useState(() => new QueryClient())
  const { resolvedTheme } = useTheme()

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={resolvedTheme === 'dark' ? themes.dark : themes.light}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
