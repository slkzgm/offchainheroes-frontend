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
  const refillLabel = refillSeconds > 0 ? formatDuration(refillSeconds) : 'Charged'

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11">
          {heroAvatar ? (
            <AvatarImage src={heroAvatar} alt={`Hero ${hero.id}`} />
          ) : (
            <AvatarFallback>#{hero.id}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-foreground">Hero #{hero.id}</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[11px] font-medium',
                session
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-sky-500/30 bg-sky-500/10 text-sky-400',
              )}
            >
              {session ? 'Fishing' : 'Standby'}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {session
              ? sessionElapsed
                ? `Elapsed ${sessionElapsed}`
                : 'Active session'
              : lastEnergyUpdateLabel
              ? `Energy updated ${lastEnergyUpdateLabel}`
              : 'Idle'}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Energy</span>
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
            <span>Zone</span>
            <span className="font-medium text-foreground">{session.zoneId ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Bait</span>
            <span className="font-medium text-foreground capitalize">{session.bait ?? 'none'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Returns in</span>
            <span className="font-medium text-foreground">{sessionRemaining !== null ? formatDuration(sessionRemaining) : '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Matures</span>
            <span className="font-medium text-foreground">{maturedAt ?? '—'}</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Cap in</span>
            <span className="font-medium text-foreground">{refillLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last update</span>
            <span className="font-medium text-foreground">{lastEnergyUpdateLabel ?? '—'}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function BaitOverviewTable({
  entries,
  totals,
}: {
  entries: BaitOverviewEntry[]
  totals: { owned: number; claimable: number }
}) {
  const rows = entries.filter((entry) => Number.isFinite(entry.rarity.order) || entry.owned + entry.claimable > 0)

  if (!rows.length) {
    return <div className="rounded-xl border border-border/50 bg-background/60 p-4 text-xs text-muted-foreground">No bait data available.</div>
  }

  return (
    <div className="rounded-xl border border-border/50 bg-background/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Rarity</TableHead>
            <TableHead className="text-right">Owned</TableHead>
            <TableHead className="text-right">Claimable today</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((entry) => (
            <TableRow key={entry.key} className="hover:bg-muted/30">
              <TableCell>
                <Badge variant="outline" className={cn('text-[11px] font-medium capitalize', entry.rarity.accentClass)}>
                  {entry.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatCount(entry.owned)}</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatCount(entry.claimable)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/40">
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="text-right font-semibold text-foreground">{formatCount(totals.owned)}</TableCell>
            <TableCell className="text-right font-semibold text-foreground">{formatCount(totals.claimable)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

function SummaryCard({ label, value, hint }: { label: string; value?: number | string | null; hint?: string }) {
  let displayValue: string

  if (typeof value === 'string') {
    displayValue = value
  } else if (typeof value === 'number') {
    displayValue = formatCount(value)
  } else if (value === null || value === undefined) {
    displayValue = '—'
  } else {
    const numeric = Number(value)
    displayValue = Number.isFinite(numeric) ? formatCount(numeric) : '—'
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
  const hasInventory = rows.some((row) => row.quantity > 0)

  return (
    <div className="rounded-xl border border-border/50 bg-background/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Fish</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit value</TableHead>
            <TableHead className="text-right">Inventory value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.definition.id} className={cn('hover:bg-muted/30', !hasInventory && 'opacity-75')}>
              <TableCell>
                <Badge variant="outline" className={cn('text-[11px] font-medium', rarityAccent(row.definition.rarity))}>
                  {row.definition.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatCount(row.quantity)}</TableCell>
              <TableCell className="text-right text-foreground">
                {row.unitValue > 0 ? formatCount(row.unitValue) : '—'}
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{formatCount(row.totalValue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/40">
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="text-right font-semibold text-foreground">{formatCount(totals.quantity)}</TableCell>
            <TableCell className="text-right text-muted-foreground">—</TableCell>
            <TableCell className="text-right font-semibold text-foreground">{formatCount(totals.value)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

function DailyDealsTable({ rows, totals }: { rows: DailyDealRow[]; totals: { sold: number; allowance: number; remaining: number } }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-6 text-xs text-muted-foreground">
        No daily deals available right now. Check back after the next reset.
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
            <TableHead>Fish</TableHead>
            <TableHead className="text-right">Progress</TableHead>
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
                      <span>{formatCount(row.sold)} sold</span>
                      <span className="opacity-70">/</span>
                      <span>{formatCount(row.allowance)} max</span>
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
                      {row.remaining > 0 ? `${formatCount(row.remaining)} remaining` : 'Sold out'}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/40">
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="text-right">
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-end gap-2 text-muted-foreground">
                  <span>{formatCount(totals.sold)} sold</span>
                  <span className="opacity-70">/</span>
                  <span>{formatCount(totals.allowance)} max</span>
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
                  {totals.remaining > 0 ? `${formatCount(totals.remaining)} remaining` : 'Sold out'}
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
  const hasAllowance = totals.allowance > 0
  const soldRatio = hasAllowance ? totals.sold / totals.allowance : 0
  const progress = clampPercentage(soldRatio * 100)
  const remainingRatio = hasAllowance ? clampPercentage(100 - progress) : 0

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase tracking-wide">Daily deals</span>
          <span>{countdownLabel}</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold text-foreground">
              {formatCount(totals.sold)} / {formatCount(totals.allowance)}
            </div>
            <div className="text-xs text-muted-foreground">Sold today</div>
          </div>
          <div className="text-xs text-muted-foreground">
            {totals.remaining > 0 ? `${formatCount(totals.remaining)} remaining` : 'Sold out'}
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
  const hasState = Boolean(state)
  const capturedAt = useMemo(() => (state?.timestamp ? formatRelative(state.timestamp) : '—'), [state?.timestamp])

  const baitOverview = useMemo(
    () => buildBaitOverview(state?.bait?.balances ?? null, state?.bait?.claimable ?? null),
    [state?.bait?.balances, state?.bait?.claimable],
  )
  const fishSnapshot = useMemo(
    () => buildFishSnapshot(state?.fish?.regular ?? null, state?.fish?.dailyDeals ?? null, state?.fish?.dealsSoldToday ?? null),
    [state?.fish?.dailyDeals, state?.fish?.dealsSoldToday, state?.fish?.regular],
  )
  const dailyReset = useMemo(() => getDailyResetInfo(state?.timestamp), [state?.timestamp])
  const dailyResetCountdown = formatDuration(dailyReset.secondsRemaining)
  const dailyResetCountdownLabel = dailyReset.secondsRemaining > 0 ? `In ${dailyResetCountdown}` : 'Resetting soon'

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Live state</CardTitle>
          <CardDescription className="text-xs">Snapshot captured {capturedAt}.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Refresh
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
                General
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="rounded-full px-4 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Inventory
              </TabsTrigger>
              <TabsTrigger
                value="roster"
                className="rounded-full px-4 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Roster
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Marble balance" value={state?.marbles?.balance} />
                <SummaryCard label="Current week" value={state?.marbles?.week} />
                <SummaryCard
                  label="Active heroes"
                  value={state?.heroes?.active?.length ?? 0}
                  hint={`${state?.heroes?.ready?.length ?? 0} ready / ${state?.heroes?.idle?.length ?? 0} idle`}
                />
                <SummaryCard
                  label="Daily deals"
                  value={`${formatCount(fishSnapshot.dailyDealTotals.sold)} / ${formatCount(fishSnapshot.dailyDealTotals.allowance)}`}
                  hint={fishSnapshot.dailyDealTotals.allowance > 0 ? `${dailyResetCountdownLabel}` : 'No deals today'}
                />
              </section>

              <section className="space-y-4">
                <DailyDealsProgressCard
                  totals={fishSnapshot.dailyDealTotals}
                  countdownLabel={fishSnapshot.dailyDealTotals.allowance > 0 ? dailyResetCountdownLabel : 'No deals today'}
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
                    Fish
                  </TabsTrigger>
                  <TabsTrigger
                    value="bait"
                    className="rounded-full px-4 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    Baits
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="fish" className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Fish inventory</span>
                    <span className="text-sm text-muted-foreground">
                      Stock levels with estimated marble value if liquidated now.
                    </span>
                  </div>
                  <FishInventoryTable rows={fishSnapshot.inventoryRows} totals={fishSnapshot.inventoryTotals} />
                  <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                    Total estimated value: <span className="font-semibold text-foreground">{formatCount(fishSnapshot.inventoryTotals.value)}</span> marbles.
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Daily deals breakdown</div>
                    <DailyDealsTable rows={fishSnapshot.dailyDealRows} totals={fishSnapshot.dailyDealTotals} />
                  </div>
                </TabsContent>

                <TabsContent value="bait" className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Bait overview</span>
                    <span className="text-sm text-muted-foreground">
                      Compare stored bait versus today&apos;s claimable queue by rarity.
                    </span>
                  </div>
                  <BaitOverviewTable entries={baitOverview.entries} totals={baitOverview.totals} />
                  {state?.bait?.totalGearStaked !== undefined && state?.bait?.totalGearStaked !== null ? (
                    <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                      Total gear staked: <span className="font-semibold text-foreground">{formatCount(state.bait.totalGearStaked)}</span>
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
                      <span className="text-xs text-muted-foreground">{group.entries.length} heroes</span>
                    </div>
                    {group.entries.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 px-3 py-4 text-xs text-muted-foreground">
                        No heroes in this state.
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
                <div className="text-xs text-muted-foreground">No hero data available.</div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-sm text-muted-foreground">No live data available.</div>
        )}
      </CardContent>
    </Card>
  )
}
