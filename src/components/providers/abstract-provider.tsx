// path: src/components/providers/abstract-provider.tsx
'use client'

import type { ReactNode } from 'react'
import { AbstractWalletProvider } from '@abstract-foundation/agw-react'
import { abstract } from 'viem/chains'

interface AbstractProviderProps {
  children: ReactNode
}

export default function AbstractProvider({ children }: AbstractProviderProps) {
  return <AbstractWalletProvider chain={abstract}>{children}</AbstractWalletProvider>
}
