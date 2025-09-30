// path: src/components/dashboard/live-state-card.tsx
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BotHeroState, BotStateResponse } from '@/lib/api'
import { formatDate, formatDuration, formatRelative } from '@/lib/format'
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

function renderBadges(record?: Record<string, unknown> | null) {
  if (!record) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const entries = Object.entries(record).filter(([, value]) => value !== undefined && value !== null)
  if (!entries.length) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <Badge key={key} variant="outline" className="font-normal">
          {key}: {String(value)}
        </Badge>
      ))}
    </div>
  )
}

export function LiveStateCard({ state, heroGroups, errorMessage, onRefresh }: LiveStateCardProps) {
  const hasState = Boolean(state)
  const capturedAt = useMemo(() => (state?.timestamp ? formatRelative(state.timestamp) : '—'), [state?.timestamp])

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
      <CardContent className="space-y-5 text-sm">
        {errorMessage ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" /> {errorMessage}
          </div>
        ) : hasState ? (
          <Tabs defaultValue="resources" className="space-y-4">
            <TabsList className="w-full justify-start overflow-auto">
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="heroes">Roster</TabsTrigger>
            </TabsList>
            <TabsContent value="resources" className="space-y-4">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Bait balances</div>
                {renderBadges(state?.bait?.balances ?? null)}
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Claimable bait</div>
                {renderBadges(state?.bait?.claimable ?? null)}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Marble balance</div>
                  <div className="text-lg font-semibold">{state?.marbles?.balance ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Current week</div>
                  <div className="text-lg font-semibold">{state?.marbles?.week ?? '—'}</div>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Fish inventory</div>
                {renderBadges(state?.fish?.regular ?? null)}
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Daily deals</div>
                {renderBadges(state?.fish?.dailyDeals ?? null)}
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Sold today</div>
                {renderBadges(state?.fish?.dealsSoldToday ?? null)}
              </div>
            </TabsContent>
            <TabsContent value="heroes" className="space-y-4">
              {heroGroups.length ? (
                heroGroups.map((group) => (
                  <div key={group.key} className="space-y-3">
                    <div className="text-xs uppercase text-muted-foreground">{group.label}</div>
                    {group.entries.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No heroes in this state.</div>
                    ) : (
                      <ScrollArea className="-mx-1">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 px-1">
                          {group.entries.map((hero) => (
                            <div
                              key={hero.id}
                              className="rounded-lg border border-border/40 bg-background/50 p-3 text-xs text-muted-foreground"
                            >
                              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                                #{hero.id}
                                <Badge variant="outline" className="text-xs font-normal">
                                  {hero.energyEstimated ?? hero.energy ?? '—'} / {hero.maxEnergy ?? '—'} energy
                                </Badge>
                              </div>
                              {hero.activeSession ? (
                                <div className="mt-2 space-y-1">
                                  <div>Elapsed {formatDuration(hero.activeSession.elapsedSeconds)}</div>
                                  <div>
                                    Matures {hero.activeSession.matureAt ? formatRelative(hero.activeSession.matureAt) : '—'}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">Zone {hero.activeSession.zoneId ?? '—'}</Badge>
                                    <Badge variant="outline">Bait {hero.activeSession.bait ?? 'none'}</Badge>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2">Last energy update {formatDate(hero.energyUpdated)}</div>
                              )}
                            </div>
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
