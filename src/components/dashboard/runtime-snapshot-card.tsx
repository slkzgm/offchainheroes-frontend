// path: src/components/dashboard/runtime-snapshot-card.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReactNode } from 'react'
import { useTranslate } from '@/i18n/client'

export interface RuntimeStat {
  key: string
  label: string
  value: ReactNode
  hint?: ReactNode
}

interface RuntimeSnapshotCardProps {
  stats: RuntimeStat[]
}

export function RuntimeSnapshotCard({ stats }: RuntimeSnapshotCardProps) {
  const t = useTranslate()
  const placeholder = t('common.placeholders.notAvailable')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t('dashboard.runtime.title')}</CardTitle>
        <CardDescription className="text-xs">{t('dashboard.runtime.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {stats.map((stat) => (
          <div key={stat.key} className="rounded-lg border border-border/60 bg-background/50 p-3">
            <div className="text-xs uppercase text-muted-foreground">{stat.label}</div>
            <div className="text-lg font-semibold">{stat.value ?? placeholder}</div>
            {stat.hint ? <div className="text-xs text-muted-foreground">{stat.hint}</div> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
