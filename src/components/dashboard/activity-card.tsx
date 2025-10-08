'use client'

// path: src/components/dashboard/activity-card.tsx
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import type { BotActivityEntry } from '@/lib/api'
import { formatDate, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'
import { useTranslate } from '@/i18n/client'

interface ActivityCardProps {
  activities: BotActivityEntry[]
  isLoading: boolean
  errorMessage?: string | null
  onRefresh: () => void
}

export function ActivityCard({ activities, isLoading, errorMessage, onRefresh }: ActivityCardProps) {
  const t = useTranslate()
  const activityTypeLabels = useMemo(
    () => ({
      heroes_launched: t('dashboard.activity.types.heroes_launched'),
      heroes_returned: t('dashboard.activity.types.heroes_returned'),
      bait_claimed: t('dashboard.activity.types.bait_claimed'),
      fish_sold: t('dashboard.activity.types.fish_sold'),
      bot_error: t('dashboard.activity.types.bot_error'),
      bot_disabled: t('dashboard.activity.types.bot_disabled'),
      global_announcement: t('dashboard.activity.types.global_announcement'),
    }),
    [t],
  )

  const formatActivityType = (type: BotActivityEntry['type']) => activityTypeLabels[type] ?? type

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">{t('dashboard.activity.title')}</CardTitle>
          <CardDescription className="text-xs">{t('dashboard.activity.description')}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {t('common.actions.refresh')}
        </Button>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" /> {errorMessage}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('dashboard.activity.empty')}</div>
        ) : (
          <ScrollArea className="h-[22rem] pr-2">
            <ul className="space-y-4">
              {activities.map((activity) => (
                <li key={activity.id} className="space-y-2 rounded-lg border border-border/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="uppercase tracking-wide">
                        {formatActivityType(activity.type)}
                      </Badge>
                      <time className="text-muted-foreground" dateTime={activity.occurredAt}>
                        {formatDate(activity.occurredAt)}
                      </time>
                    </div>
                    <div className="text-muted-foreground">{formatRelative(activity.occurredAt)}</div>
                  </div>

                  <div className="text-sm font-semibold text-foreground">{activity.title}</div>

                  {activity.description && (
                    <div className="text-xs text-muted-foreground">{activity.description}</div>
                  )}

                  <Highlights activity={activity} />

                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer select-none">{t('dashboard.activity.rawData')}</summary>
                    <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed text-foreground">
                      {JSON.stringify(activity.data, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

interface HighlightItem {
  label: string
  value: string
}

function Highlights({ activity }: { activity: BotActivityEntry }) {
  const t = useTranslate()
  const placeholder = t('common.placeholders.notAvailable')
  const highlights = deriveHighlights(activity, t)
  if (highlights.length === 0) {
    return null
  }
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {highlights.map(({ label, value }) => (
        <li key={label}>
          <span className="font-medium text-foreground">{label}:</span>{' '}
          <span className={cn(value === placeholder && 'text-muted-foreground/80')}>{value}</span>
        </li>
      ))}
    </ul>
  )
}

function deriveHighlights(activity: BotActivityEntry, t: ReturnType<typeof useTranslate>): HighlightItem[] {
  const entries: HighlightItem[] = []
  const data = activity.data ?? {}
  const placeholder = t('common.placeholders.notAvailable')

  switch (activity.type) {
    case 'heroes_launched': {
      const heroIds = Array.isArray(data.heroIds) ? data.heroIds.length : null
      const nextCheck = typeof data.nextCheckAt === 'string' ? data.nextCheckAt : null
      entries.push({
        label: t('dashboard.activity.highlights.heroes'),
        value: heroIds ? String(heroIds) : placeholder,
      })
      if (nextCheck) {
        entries.push({ label: t('dashboard.activity.highlights.nextCheck'), value: formatRelative(nextCheck) })
      }
      break
    }
    case 'heroes_returned': {
      const summary = isRecord(data.summary) ? data.summary : {}
      const totalFish = coerceNumber(summary.totalFish)
      const rewardedHeroes = coerceNumber(summary.rewardedHeroCount)
      const estimated = coerceNumber(summary.estimatedRegularValue)
      entries.push({
        label: t('dashboard.activity.highlights.heroes'),
        value: rewardedHeroes ? String(rewardedHeroes) : placeholder,
      })
      entries.push({
        label: t('dashboard.activity.highlights.fish'),
        value: totalFish ? String(totalFish) : placeholder,
      })
      if (estimated && estimated > 0) {
        entries.push({ label: t('dashboard.activity.highlights.estMarbles'), value: String(estimated) })
      }
      break
    }
    case 'bait_claimed': {
      const total = coerceNumber(data.totalClaimed)
      entries.push({
        label: t('dashboard.activity.highlights.baitClaimed'),
        value: total ? String(total) : placeholder,
      })
      break
    }
    case 'fish_sold': {
      const sold = coerceNumber(data.dailyDealFishSold)
      const marbles = coerceNumber(data.marblesEarned)
      entries.push({
        label: t('dashboard.activity.highlights.fish'),
        value: sold ? String(sold) : placeholder,
      })
      entries.push({
        label: t('dashboard.activity.highlights.marbles'),
        value: marbles ? String(marbles) : placeholder,
      })
      break
    }
    case 'bot_error': {
      const message = typeof data.message === 'string' ? data.message : activity.description ?? ''
      const disable = data.disable === true
      entries.push({
        label: t('dashboard.activity.highlights.error'),
        value: message || placeholder,
      })
      if (disable) {
        entries.push({
          label: t('dashboard.activity.highlights.automation'),
          value: t('dashboard.activity.highlights.disabledValue'),
        })
      }
      break
    }
    case 'bot_disabled': {
      const defaultReason = t('dashboard.activity.highlights.automationPaused')
      const reason = typeof data.message === 'string' ? data.message : activity.description ?? defaultReason
      entries.push({
        label: t('dashboard.activity.highlights.status'),
        value: t('dashboard.activity.highlights.disabledValue'),
      })
      entries.push({ label: t('dashboard.activity.highlights.reason'), value: reason })
      break
    }
    case 'global_announcement': {
      const scope = typeof data.scope === 'string' ? data.scope : 'Global'
      const scopeValue = scope || t('dashboard.activity.highlights.global')
      entries.push({ label: t('dashboard.activity.highlights.scope'), value: scopeValue })
      break
    }
    default:
      break
  }

  return entries
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
