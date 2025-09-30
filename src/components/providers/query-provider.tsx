'use client'

import { type PropsWithChildren, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function QueryProvider({ children }: PropsWithChildren): JSX.Element {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        retry: 1,
      },
    },
  }))

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
