// path: src/hooks/use-session.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { getSession, type SessionInfo } from '@/lib/api'

export function useSession() {
  const query = useQuery<SessionInfo | null, Error>({
    queryKey: ['session'],
    queryFn: getSession,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  return {
    session: query.data,
    isAuthenticated: Boolean(query.data),
    isLoading: query.isLoading,
    refetch: query.refetch,
    query,
  }
}
