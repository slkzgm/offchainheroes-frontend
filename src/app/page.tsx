// path: src/app/page.tsx
import ThemeSwitcher from '@/components/theme-switcher'
import SiweLogin from '@/components/siwe-login'
import BotDashboard from '@/components/dashboard/bot-dashboard'

export default function Home() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        <div className="text-xl font-semibold">Offchain Heroes Control Panel</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-md border p-4">
          <h2 className="text-base font-semibold">Authentication</h2>
          <SiweLogin />
        </section>
        <BotDashboard />
      </div>
    </div>
  )
}
