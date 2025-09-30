// path: src/app/dashboard/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import ThemeSwitcher from '@/components/theme-switcher'
import BotDashboard from '@/components/dashboard/bot-dashboard'
import { useSession } from '@/hooks/use-session'
import { logout } from '@/lib/api'
import { getUserOverview, type UserOverviewResponse } from '@/lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getAvatarUrl, truncateAddress } from '@/lib/format'

export default function DashboardPage() {
  const router = useRouter()
  const { session, isAuthenticated, isLoading, refetch: refetchSession } = useSession()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || isLoading) return
    if (!isAuthenticated) {
      router.replace('/')
    }
  }, [isMounted, isLoading, isAuthenticated, router])

  const overviewQuery = useQuery<UserOverviewResponse, Error>({
    queryKey: ['user-overview', session?.userId],
    queryFn: () => getUserOverview(),
    enabled: isAuthenticated,
  })

  const username = useMemo(() => {
    const profileName = overviewQuery.data?.sessionUser?.username?.trim()
    if (profileName) return profileName
    const fallback = truncateAddress(session?.address)
    return fallback !== '—' ? fallback : 'Pilot'
  }, [overviewQuery.data?.sessionUser?.username, session?.address])

  const avatarUrl = useMemo(
    () => getAvatarUrl(overviewQuery.data?.sessionUser?.avatarId ?? undefined),
    [overviewQuery.data?.sessionUser?.avatarId],
  )

  if (!isMounted || isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Preparing dashboard…</div>
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
        Redirecting to sign-in…
      </div>
    )
  }

  const handleLogout = async () => {
    await logout().catch(() => {})
    await refetchSession()
    router.replace('/')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-border/70">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={username} /> : null}
            <AvatarFallback className="bg-muted text-lg font-semibold">
              {username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Automation dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Button variant="outline" size="sm" onClick={() => void handleLogout()} disabled={overviewQuery.isLoading}>
            Logout
          </Button>
        </div>
      </header>
      <BotDashboard />
    </main>
  )
}
