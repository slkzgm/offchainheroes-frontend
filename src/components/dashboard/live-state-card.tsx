'use client'

import { useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BotHeroState, BotStateResponse } from '@/lib/api'
import { formatDuration, formatRelative, getAvatarUrl } from '@/lib/format'
import {
  buildBaitOverview,
  buildFishSnapshot,
  rarityAccent,
  type BaitOverviewEntry,
  type DailyDealRow,
  type FishInventoryRow,
  type FishInventoryTotals,
} from '@/lib/live-state'
import { cn } from '@/lib/utils'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { useTranslate } from '@/i18n/client'
import { Skeleton } from '@/components/ui/skeleton'
import { useBaitDefinitions, useFishDefinitions } from '@/hooks/use-game-catalogue'

export interface LiveStateHeroGroup {
  key: string
  label: string
  entries: BotHeroState[]
}

interface LiveStateCardProps {
  state?: BotStateResponse
  heroGroups: LiveStateHeroGroup[]
  errorMessage?: string | null
  onRefresh: () => void
}

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

const ENERGY_REGEN_PER_HOUR = 100 / 24
const ENERGY_REGEN_PER_SECOND = ENERGY_REGEN_PER_HOUR / 3600

function formatCount(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return integerFormatter.format(value)
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

function getDailyResetInfo(timestamp?: string | null) {
  const base = timestamp ? new Date(timestamp) : new Date()
  const reference = Number.isNaN(base.getTime()) ? new Date() : base
  const reset = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() + 1, 0, 0, 0, 0))
  const secondsRemaining = Math.max(0, Math.floor((reset.getTime() - Date.now()) / 1000))
  return {
    iso: reset.toISOString(),
    secondsRemaining,
  }
}

function HeroCard({ hero }: { hero: BotHeroState }) {
  const t = useTranslate()
  const heroId = typeof hero.id === 'number' ? hero.id : Number.parseInt(String(hero.id), 10)
  const heroAvatar = Number.isFinite(heroId) ? getAvatarUrl(heroId) : undefined
  const energyCurrent = hero.energyEstimated ?? hero.energy ?? 0
  const energyMax = hero.maxEnergy ?? 0
  const energyLabel = energyMax > 0 ? `${energyCurrent} / ${energyMax}` : '—'
  const energyPercentage = energyMax > 0 ? clampPercentage((energyCurrent / energyMax) * 100) : 0
  const lastEnergyUpdateRelative = hero.energyUpdated ? formatRelative(hero.energyUpdated) : null
  const lastEnergyUpdateLabel = lastEnergyUpdateRelative && lastEnergyUpdateRelative.length ? lastEnergyUpdateRelative : null
  const session = hero.activeSession
  const maturedAt = session?.matureAt ? formatRelative(session.matureAt) : null
  const sessionElapsed = session?.elapsedSeconds ? formatDuration(session.elapsedSeconds) : null
  const sessionDuration = session?.durationSeconds ?? null
  const sessionRemaining = sessionDuration !== null && session?.elapsedSeconds !== undefined ? Math.max(0, sessionDuration - session.elapsedSeconds) : null

  const energyDeficit = Math.max(0, energyMax - energyCurrent)
  const refillSeconds = ENERGY_REGEN_PER_SECOND > 0 && energyDeficit > 0 ? Math.round(energyDeficit / ENERGY_REGEN_PER_SECOND) : 0
  const refillLabel = refillSeconds > 0 ? formatDuration(refillSeconds) : t('dashboard.liveState.heroCard.charged')
  const placeholder = t('common.placeholders.notAvailable')

  const statusText = session
    ? sessionElapsed
      ? t('dashboard.liveState.heroCard.elapsed', { duration: sessionElapsed })
      : t('dashboard.liveState.heroCard.activeSession')
    : lastEnergyUpdateLabel
    ? t('dashboard.liveState.heroCard.energyUpdated', { time: lastEnergyUpdateLabel })
    : t('dashboard.liveState.heroCard.idle')

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11">
          {heroAvatar ? (
            <AvatarImage src={heroAvatar} alt={t('dashboard.liveState.heroCard.alt', { id: hero.id })} />
          ) : (
            <AvatarFallback>#{hero.id}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {t('dashboard.liveState.heroCard.hero', { id: hero.id })}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-[11px] font-medium',
                session
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-sky-500/30 bg-sky-500/10 text-sky-400',
              )}
            >
              {session
                ? t('dashboard.liveState.heroCard.statusFishing')
                : t('dashboard.liveState.heroCard.statusStandby')}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{statusText}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('dashboard.liveState.heroCard.energy')}</span>
          <span className="font-medium text-foreground">{energyLabel}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width]"
            style={{ width: `${energyPercentage}%` }}
          />
        </div>
      </div>

      {session ? (
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>{t('dashboard.liveState.heroCard.zone')}</span>
            <span className="font-medium text-foreground">{session.zoneId ?? placeholder}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t('dashboard.liveState.heroCard.bait')}</span>
            <span className="font-medium text-foreground capitalize">
              {session.bait ?? t('dashboard.liveState.heroCard.none')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t('dashboard.liveState.heroCard.returnsIn')}</span>
            <span className="font-medium text-foreground">
              {sessionRemaining !== null ? formatDuration(sessionRemaining) : placeholder}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t('dashboard.liveState.heroCard.matures')}</span>
            <span className="font-medium text-foreground">{maturedAt ?? placeholder}</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>{t('dashboard.liveState.heroCard.capIn')}</span>
            <span className="font-medium text-foreground">{refillLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t('dashboard.liveState.heroCard.lastUpdate')}</span>
            <span className="font-medium text-foreground">{lastEnergyUpdateLabel ?? placeholder}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function BaitOverviewTable({
  entries,
  totals,
  generationPerRarity,
  generationTotal,
}: {
  entries: BaitOverviewEntry[]
  totals: { owned: number; claimable: number }
  generationPerRarity: Map<string, number> | null
  generationTotal: number | null
}) {
  const t = useTranslate()
  const rows = entries.filter((entry) => Number.isFinite(entry.rarity.order) || entry.owned + entry.claimable > 0)

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-border/50 bg-background/60 p-4 text-xs text-muted-foreground">
        {t('dashboard.liveState.bait.noData')}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 bg-background/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>{t('dashboard.liveState.bait.table.rarity')}</TableHead>
            <TableHead className="text-right">{t('dashboard.liveState.bait.table.owned')}</TableHead>
            <TableHead className="text-right">{t('dashboard.liveState.bait.table.claimable')}</TableHead>
            <TableHead className="text-right">{t('dashboard.liveState.bait.table.daily')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((entry) => (
            <TableRow key={entry.key} className="hover:bg-muted/30">
              <TableCell>
                <div className="flex items-center gap-3">
                  {entry.rarity.image ? (
                    <Avatar className="h-8 w-8 border border-border/40 bg-background">
                      <AvatarImage src={entry.rarity.image} alt={entry.label} />
                      <AvatarFallback className="text-xs font-medium">{entry.label.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : null}
                  <Badge variant="outline" className={cn('text-[11px] font-medium capitalize', entry.rarity.accentClass)}>
                    {entry.label}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatCount(entry.owned)}</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatCount(entry.claimable)}</TableCell>
              <TableCell className="text-right font-semibold text-foreground">
                {generationPerRarity?.has(entry.key.toLowerCase())
                  ? formatCount(generationPerRarity.get(entry.key.toLowerCase()) ?? 0)
                  : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/40">
            <TableCell className="font-semibold">{t('dashboard.liveState.bait.table.total')}</TableCell>
            <TableCell className="text-right font-semibold text-foreground">{formatCount(totals.owned)}</TableCell>
            <TableCell className="text-right font-semibold text-foreground">{formatCount(totals.claimable)}</TableCell>
            <TableCell className="text-right font-semibold text-foreground">
              {generationTotal !== null && generationTotal !== undefined ? formatCount(generationTotal) : '—'}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

function SummaryCard({ label, value, hint }: { label: string; value?: number | string | null; hint?: string }) {
  const t = useTranslate()
  const placeholder = t('common.placeholders.notAvailable')
  let displayValue: string

  if (typeof value === 'string') {
    displayValue = value
  } else if (typeof value === 'number') {
    displayValue = formatCount(value)
  } else if (value === null || value === undefined) {
    displayValue = placeholder
  } else {
    const numeric = Number(value)
    displayValue = Number.isFinite(numeric) ? formatCount(numeric) : placeholder
  }

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold text-foreground">{displayValue}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

function FishInventoryTable({ rows, totals }: { rows: FishInventoryRow[]; totals: FishInventoryTotals }) {
  const t = useTranslate()
  const hasInventory = rows.some((row) => row.quantity > 0)
  const placeholder = t('common.placeholders.notAvailable')

  return (
    <div className="rounded-xl border border-border/50 bg-background/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>{t('dashboard.liveState.inventory.table.fish')}</TableHead>
            <TableHead className="text-right">{t('dashboard.liveState.inventory.table.quantity')}</TableHead>
            <TableHead className="text-right">{t('dashboard.liveState.inventory.table.unitValue')}</TableHead>
            <TableHead className="text-right">{t('dashboard.liveState.inventory.table.inventoryValue')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.definition.id} className={cn('hover:bg-muted/30', !hasInventory && 'opacity-75')}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {row.definition.image ? (
                    <Avatar className="h-8 w-8 border border-border/40 bg-background">
                      <AvatarImage src={row.definition.image} alt={row.definition.label} />
                      <AvatarFallback className="text-xs font-medium">{row.definition.label.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : null}
                  <Badge variant="outline" className={cn('text-[11px] font-medium', rarityAccent(row.definition.rarity))}>
                    {row.definition.label}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatCount(row.quantity)}</TableCell>
              <TableCell className="text-right text-foreground">
                {row.unitValue > 0 ? formatCount(row.unitValue) : placeholder}
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatCount(row.totalValue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/40">
            <TableCell className="font-semibold">{t('dashboard.liveState.inventory.table.total')}</TableCell>
            <TableCell className="text-right font-semibold text-foreground">{formatCount(totals.quantity)}</TableCell>
            <TableCell className="text-right text-muted-foreground">{placeholder}</TableCell>
            <TableCell className="text-right font-semibold text-foreground">{formatCount(totals.value)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

function DailyDealsTable({ rows, totals }: { rows: DailyDealRow[]; totals: { sold: number; allowance: number; remaining: number } }) {
  const t = useTranslate()
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-6 text-xs text-muted-foreground">
        {t('dashboard.liveState.inventory.noDeals')}
      </div>
    )
  }

  const soldRatio = totals.allowance > 0 ? totals.sold / totals.allowance : 0
  const totalProgress = clampPercentage(soldRatio * 100)

  return (
    <div className="rounded-xl border border-border/50 bg-background/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>{t('dashboard.liveState.inventory.table.fish')}</TableHead>
            <TableHead className="text-right">{t('dashboard.liveState.inventory.table.progress')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const hasAllowance = row.allowance > 0
            const progress = hasAllowance ? clampPercentage((row.sold / row.allowance) * 100) : 0
            const remainingRatio = hasAllowance ? clampPercentage(100 - progress) : 0
            return (
              <TableRow key={row.definition.id} className="hover:bg-muted/30">
                <TableCell>
                  <Badge variant="outline" className={cn('text-[11px] font-medium', rarityAccent(row.definition.rarity))}>
                    {row.definition.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-end gap-2 text-muted-foreground">
                      <span>
                        {t('dashboard.liveState.progress.sold', { count: formatCount(row.sold) })}
                      </span>
                      <span className="opacity-70">/</span>
                      <span>
                        {t('dashboard.liveState.progress.max', { count: formatCount(row.allowance) })}
                      </span>
                    </div>
                    <div className="relative h-2 w-36 overflow-hidden rounded-full bg-muted">
                      <div
                        className="absolute inset-y-0 right-0 h-full bg-muted-foreground/20"
                        style={{ width: `${remainingRatio}%` }}
                      />
                      <div
                        className={cn('relative h-full rounded-full transition-[width]', progress >= 100 ? 'bg-emerald-400' : 'bg-emerald-500')}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {row.remaining > 0
                        ? t('dashboard.liveState.progress.remaining', { count: formatCount(row.remaining) })
                        : t('dashboard.liveState.progress.soldOut')}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/40">
            <TableCell className="font-semibold">{t('dashboard.liveState.inventory.table.total')}</TableCell>
            <TableCell className="text-right">
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-end gap-2 text-muted-foreground">
                  <span>{t('dashboard.liveState.progress.sold', { count: formatCount(totals.sold) })}</span>
                  <span className="opacity-70">/</span>
                  <span>{t('dashboard.liveState.progress.max', { count: formatCount(totals.allowance) })}</span>
                </div>
                <div className="relative h-2 w-36 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 right-0 h-full bg-muted-foreground/20"
                    style={{ width: `${clampPercentage(100 - totalProgress)}%` }}
                  />
                  <div
                    className={cn(
                      'relative h-full rounded-full transition-[width]',
                      totals.allowance > 0 && totals.sold >= totals.allowance ? 'bg-emerald-400' : 'bg-emerald-500',
                    )}
                    style={{ width: `${totalProgress}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {totals.remaining > 0
                    ? t('dashboard.liveState.progress.remaining', { count: formatCount(totals.remaining) })
                    : t('dashboard.liveState.progress.soldOut')}
                </div>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

function DailyDealsProgressCard({
  totals,
  countdownLabel,
}: {
  totals: { sold: number; allowance: number; remaining: number }
  countdownLabel: string
}) {
  const t = useTranslate()
  const hasAllowance = totals.allowance > 0
  const soldRatio = hasAllowance ? totals.sold / totals.allowance : 0
  const progress = clampPercentage(soldRatio * 100)
  const remainingRatio = hasAllowance ? clampPercentage(100 - progress) : 0

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase tracking-wide">{t('dashboard.liveState.progress.title')}</span>
          <span>{countdownLabel}</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold text-foreground">
              {formatCount(totals.sold)} / {formatCount(totals.allowance)}
            </div>
            <div className="text-xs text-muted-foreground">{t('dashboard.liveState.progress.soldToday')}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            {totals.remaining > 0
              ? t('dashboard.liveState.progress.remaining', { count: formatCount(totals.remaining) })
              : t('dashboard.liveState.progress.soldOut')}
          </div>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className="absolute inset-y-0 right-0 h-full bg-muted-foreground/20" style={{ width: `${remainingRatio}%` }} />
          <div
            className={cn('relative h-full rounded-full transition-[width]', progress >= 100 ? 'bg-emerald-400' : 'bg-emerald-500')}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function LiveStateCard({ state, heroGroups, errorMessage, onRefresh }: LiveStateCardProps) {
  const t = useTranslate()
  const baitDefinitionsQuery = useBaitDefinitions()
  const fishDefinitionsQuery = useFishDefinitions()
  const hasState = Boolean(state)
  const capturedAt = useMemo(() => (state?.timestamp ? formatRelative(state.timestamp) : null), [state?.timestamp])

  const baitOverview = useMemo(
    () =>
      buildBaitOverview(
        state?.bait?.balances ?? null,
        state?.bait?.claimable ?? null,
        baitDefinitionsQuery.data ?? [],
      ),
    [baitDefinitionsQuery.data, state?.bait?.balances, state?.bait?.claimable],
  )
  const baitGeneration = useMemo(() => {
    const generation = state?.bait?.generation
    if (!generation) return null

    const perRarity = new Map<string, number>()
    for (const [rawKey, value] of Object.entries(generation.perRarity ?? {})) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      perRarity.set(rawKey.toLowerCase(), Math.max(0, value))
    }

    const total = Number.isFinite(generation.total)
      ? Math.max(0, generation.total as number)
      : Array.from(perRarity.values()).reduce((sum, value) => sum + value, 0)

    return { perRarity, total }
  }, [state?.bait?.generation])
  const fishSnapshot = useMemo(
    () =>
      buildFishSnapshot(
        fishDefinitionsQuery.data ?? [],
        state?.fish?.regular ?? null,
        state?.fish?.dailyDeals ?? null,
        state?.fish?.dealsSoldToday ?? null,
      ),
    [
      fishDefinitionsQuery.data,
      state?.fish?.dailyDeals,
      state?.fish?.dealsSoldToday,
      state?.fish?.regular,
    ],
  )
  const dailyReset = useMemo(() => getDailyResetInfo(state?.timestamp), [state?.timestamp])
  const dailyResetCountdown = formatDuration(dailyReset.secondsRemaining)
  const dailyResetCountdownLabel =
    dailyReset.secondsRemaining > 0
      ? t('dashboard.liveState.summary.countdown.in', { duration: dailyResetCountdown })
      : t('dashboard.liveState.summary.countdown.soon')

  const captureLabel = capturedAt && capturedAt.length ? capturedAt : t('common.placeholders.notAvailable')

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">{t('dashboard.liveState.title')}</CardTitle>
          <CardDescription className="text-xs">
            {t('dashboard.liveState.description', { time: captureLabel })}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
          <RotateCcw className="h-4 w-4" /> {t('common.actions.refresh')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {errorMessage ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" /> {errorMessage}
          </div>
        ) : hasState ? (
          <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="mx-auto grid h-auto w-full max-w-xl grid-cols-3 gap-2 rounded-full bg-muted/50 p-1">
            <TabsTrigger
              value="general"
              className="rounded-full px-4 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {t('dashboard.liveState.tabs.general')}
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="rounded-full px-4 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {t('dashboard.liveState.tabs.inventory')}
            </TabsTrigger>
            <TabsTrigger
              value="roster"
              className="rounded-full px-4 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {t('dashboard.liveState.tabs.roster')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label={t('dashboard.liveState.summary.marbleBalance')} value={state?.marbles?.balance} />
              <SummaryCard label={t('dashboard.liveState.summary.currentWeek')} value={state?.marbles?.week} />
              <SummaryCard
                label={t('dashboard.liveState.summary.activeHeroes')}
                value={state?.heroes?.active?.length ?? 0}
                hint={t('dashboard.liveState.summary.activeHeroesHint', {
                  ready: formatCount(state?.heroes?.ready?.length ?? 0),
                  idle: formatCount(state?.heroes?.idle?.length ?? 0),
                })}
              />
              <SummaryCard
                label={t('dashboard.liveState.summary.dailyDeals')}
                value={`${formatCount(fishSnapshot.dailyDealTotals.sold)} / ${formatCount(fishSnapshot.dailyDealTotals.allowance)}`}
                hint={
                  fishSnapshot.dailyDealTotals.allowance > 0
                    ? dailyResetCountdownLabel
                    : t('dashboard.liveState.summary.noDeals')
                }
              />
            </section>

            <section className="space-y-4">
              <DailyDealsProgressCard
                totals={fishSnapshot.dailyDealTotals}
                countdownLabel={
                  fishSnapshot.dailyDealTotals.allowance > 0
                    ? dailyResetCountdownLabel
                    : t('dashboard.liveState.summary.noDeals')
                }
              />
            </section>
          </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <Tabs defaultValue="fish" className="space-y-4">
                <TabsList className="mx-auto grid h-auto w-full max-w-xs grid-cols-2 gap-2 rounded-full bg-muted/50 p-1">
                  <TabsTrigger
                    value="fish"
                    className="rounded-full px-4 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    {t('dashboard.liveState.inventory.fishTab')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="bait"
                    className="rounded-full px-4 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    {t('dashboard.liveState.inventory.baitTab')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="fish" className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t('dashboard.liveState.inventory.fishSectionTitle')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t('dashboard.liveState.inventory.fishSectionDescription')}
                    </span>
                  </div>
                  <FishInventoryTable rows={fishSnapshot.inventoryRows} totals={fishSnapshot.inventoryTotals} />
                  <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                    {t('dashboard.liveState.inventory.totalEstimatedValue', {
                      value: formatCount(fishSnapshot.inventoryTotals.value),
                    })}
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t('dashboard.liveState.inventory.dealsBreakdown')}
                    </div>
                    <DailyDealsTable rows={fishSnapshot.dailyDealRows} totals={fishSnapshot.dailyDealTotals} />
                  </div>
                </TabsContent>

                <TabsContent value="bait" className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t('dashboard.liveState.bait.title')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t('dashboard.liveState.bait.description')}
                    </span>
                  </div>
                  <BaitOverviewTable
                    entries={baitOverview.entries}
                    totals={baitOverview.totals}
                    generationPerRarity={baitGeneration?.perRarity ?? null}
                    generationTotal={baitGeneration?.total ?? null}
                  />
                  {state?.bait?.totalGearStaked !== undefined && state?.bait?.totalGearStaked !== null ? (
                    <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                      {t('dashboard.liveState.bait.totalGearStaked', {
                        value: formatCount(state.bait.totalGearStaked),
                      })}
                    </div>
                  ) : null}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="roster" className="space-y-4">
              {heroGroups.length ? (
                heroGroups.map((group) => (
                  <div key={group.key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{group.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('dashboard.liveState.roster.heroesCount', { count: formatCount(group.entries.length) })}
                      </span>
                    </div>
                    {group.entries.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 px-3 py-4 text-xs text-muted-foreground">
                        {t('dashboard.liveState.roster.emptyState')}
                      </div>
                    ) : (
                      <ScrollArea className="-mx-1">
                        <div className="grid gap-4 px-1 md:grid-cols-2 xl:grid-cols-3">
                          {group.entries.map((hero) => (
                            <HeroCard key={`${group.key}-${hero.id}`} hero={hero} />
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">{t('dashboard.liveState.roster.noData')}</div>
              )}
            </TabsContent>
          </Tabs>
        ) : state === undefined ? (
          <LiveStateSkeleton label={t('dashboard.liveState.loading')} />
        ) : (
          <div className="text-sm text-muted-foreground">{t('dashboard.liveState.notification.noLiveData')}</div>
        )}
      </CardContent>
    </Card>
  )
}

function LiveStateSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="space-y-6" aria-hidden="true">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border/50 bg-background/60 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-6 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border/50 bg-background/60 p-4">
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-9 w-full rounded-full" />
          <div className="rounded-xl border border-border/50 bg-background/60 p-4">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
