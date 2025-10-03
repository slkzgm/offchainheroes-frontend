// path: src/components/dashboard/activity-card.tsx
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import type { BotActivityEntry } from '@/lib/api'
import { formatDate, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ActivityCardProps {
  activities: BotActivityEntry[]
  isLoading: boolean
  errorMessage?: string | null
  onRefresh: () => void
}

export function ActivityCard({ activities, isLoading, errorMessage, onRefresh }: ActivityCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
          <CardDescription className="text-xs">Key bot actions visible to players.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" /> {errorMessage}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-sm text-muted-foreground">No activity recorded yet.</div>
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
                    <summary className="cursor-pointer select-none">Raw data</summary>
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

const activityLabels: Record<BotActivityEntry['type'], string> = {
  heroes_launched: 'Heroes launched',
  heroes_returned: 'Heroes returned',
  bait_claimed: 'Bait claimed',
  fish_sold: 'Fish sold',
  bot_error: 'Bot error',
  bot_disabled: 'Bot disabled',
  global_announcement: 'Announcement',
}

function formatActivityType(type: BotActivityEntry['type']): string {
  return activityLabels[type] ?? type
}

interface HighlightItem {
  label: string
  value: string
}

function Highlights({ activity }: { activity: BotActivityEntry }) {
  const highlights = deriveHighlights(activity)
  if (highlights.length === 0) {
    return null
  }
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {highlights.map(({ label, value }) => (
        <li key={label}>
          <span className="font-medium text-foreground">{label}:</span>{' '}
          <span className={cn(value === '—' && 'text-muted-foreground/80')}>{value}</span>
        </li>
      ))}
    </ul>
  )
}

function deriveHighlights(activity: BotActivityEntry): HighlightItem[] {
  const entries: HighlightItem[] = []
  const data = activity.data ?? {}

  switch (activity.type) {
    case 'heroes_launched': {
      const heroIds = Array.isArray(data.heroIds) ? data.heroIds.length : null
      const nextCheck = typeof data.nextCheckAt === 'string' ? data.nextCheckAt : null
      entries.push({ label: 'Heroes', value: heroIds ? String(heroIds) : '—' })
      if (nextCheck) {
        entries.push({ label: 'Next check', value: formatRelative(nextCheck) })
      }
      break
    }
    case 'heroes_returned': {
      const summary = isRecord(data.summary) ? data.summary : {}
      const totalFish = coerceNumber(summary.totalFish)
      const rewardedHeroes = coerceNumber(summary.rewardedHeroCount)
      const estimated = coerceNumber(summary.estimatedRegularValue)
      entries.push({ label: 'Heroes', value: rewardedHeroes ? String(rewardedHeroes) : '—' })
      entries.push({ label: 'Fish', value: totalFish ? String(totalFish) : '—' })
      if (estimated && estimated > 0) {
        entries.push({ label: 'Est. marbles', value: String(estimated) })
      }
      break
    }
    case 'bait_claimed': {
      const total = coerceNumber(data.totalClaimed)
      entries.push({ label: 'Bait claimed', value: total ? String(total) : '—' })
      break
    }
    case 'fish_sold': {
      const sold = coerceNumber(data.dailyDealFishSold)
      const marbles = coerceNumber(data.marblesEarned)
      entries.push({ label: 'Fish', value: sold ? String(sold) : '—' })
      entries.push({ label: 'Marbles', value: marbles ? String(marbles) : '—' })
      break
    }
    case 'bot_error': {
      const message = typeof data.message === 'string' ? data.message : activity.description ?? ''
      const disable = data.disable === true
      entries.push({ label: 'Error', value: message || '—' })
      if (disable) {
        entries.push({ label: 'Automation', value: 'Disabled' })
      }
      break
    }
    case 'bot_disabled': {
      const reason = typeof data.message === 'string' ? data.message : activity.description ?? 'Automation paused'
      entries.push({ label: 'Status', value: 'Disabled' })
      entries.push({ label: 'Reason', value: reason })
      break
    }
    case 'global_announcement': {
      const scope = typeof data.scope === 'string' ? data.scope : 'Global'
      entries.push({ label: 'Scope', value: scope })
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
