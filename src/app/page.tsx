// path: src/app/page.tsx
import ThemeSwitcher from '@/components/theme-switcher'
import LandingAuthPanel from '@/components/landing-auth-panel'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-12 px-6 py-16">
      <header className="flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight">Offchain Heroes</div>
        <ThemeSwitcher />
      </header>
      <LandingAuthPanel />
    </main>
  )
}
