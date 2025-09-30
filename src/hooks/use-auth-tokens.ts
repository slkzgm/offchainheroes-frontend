'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadTokens, onTokensChanged, type StoredTokens, TOKEN_STORAGE_KEY } from '@/lib/api'

interface UseAuthTokensResult {
  tokens: StoredTokens | null
  refreshTokens: () => void
}

export function useAuthTokens(): UseAuthTokensResult {
  const [tokens, setTokens] = useState<StoredTokens | null>(() => loadTokens())

  const syncTokens = useCallback(() => {
    setTokens(loadTokens())
  }, [])

  useEffect(() => {
    const unsubscribe = onTokensChanged(syncTokens)

    function handleStorage(event: StorageEvent) {
      if (event.key === null || event.key === TOKEN_STORAGE_KEY) {
        syncTokens()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage)
    }

    return () => {
      unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage)
      }
    }
  }, [syncTokens])

  return { tokens, refreshTokens: syncTokens }
}
