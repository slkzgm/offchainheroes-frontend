// path: src/app/layout.tsx
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

const SITE_NAME = 'Onchain Superheroes Automation'
const SITE_URL = 'https://app.onchainsuperheroes.xyz'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Configure automation, monitor runs, and review live telemetry for your Onchain Heroes squads with the Onchain Superheroes control center.',
  applicationName: SITE_NAME,
  keywords: [
    'Onchain Superheroes',
    'Onchain Heroes',
    'automation',
    'web3 gaming',
    'bot dashboard',
    'crypto strategy',
  ],
  authors: [
    {
      name: 'SLKzᵍᵐ',
      url: 'https://github.com/slkzgm',
    },
    {
      name: 'SLKzᵍᵐ',
      url: 'https://slkz.dev/',
    },
  ],
  creator: 'SLKzᵍᵐ',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description:
      'Secure dashboard for managing Onchain Heroes automation: configure routines, trigger runs, and track performance in real time.',
    images: [
      {
        url: '/og/social-preview.png',
        width: 1200,
        height: 630,
        alt: 'Onchain Superheroes automation dashboard preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description:
      'Control Onchain Heroes automation with live telemetry, scheduling insights, and streamlined session management.',
    creator: '@0xSLK',
    site: '@0xSLK',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
