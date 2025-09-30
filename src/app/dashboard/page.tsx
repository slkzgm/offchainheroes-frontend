// path: src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ThemeSwitcher from '@/components/theme-switcher'
import BotDashboard from '@/components/dashboard/bot-dashboard'
import { useSession } from '@/hooks/use-session'

export default function DashboardPage(): JSX.Element {
  const router = useRouter()
  const { session, isAuthenticated, isLoading } = useSession()
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

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automation dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {session?.address}</p>
        </div>
        <ThemeSwitcher />
      </header>
      <BotDashboard />
    </main>
  )
}
