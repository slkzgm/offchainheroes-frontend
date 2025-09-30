'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, CalendarClock, CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { useAuthTokens } from '@/hooks/use-auth-tokens'
import {
  getUserOverview,
  getBotConfig,
  updateBotConfig,
  triggerManualRun,
  getBotLogs,
  getBotState,
  type BotConfigurationResponse,
  type BotStateResponse,
  type BotLogEntry,
  type UserOverviewResponse,
} from '@/lib/api'
import { toast } from 'sonner'

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatRelative(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes === 0) return 'now'
  if (diffMinutes > 0) return `in ${diffMinutes} min`
  return `${Math.abs(diffMinutes)} min ago`
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '—'
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const parts: string[] = []
  if (hours) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  return parts.join(' ')
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

function renderBadges(record?: Record<string, unknown> | null): JSX.Element {
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

export default function BotDashboard(): JSX.Element {
  const { tokens } = useAuthTokens()
  const accessToken = tokens?.accessToken
  const queryClient = useQueryClient()

  const overviewQuery = useQuery<UserOverviewResponse, Error>({
    queryKey: ['user-overview', accessToken],
    queryFn: () => getUserOverview(accessToken as string),
    enabled: Boolean(accessToken),
  })

  const configQuery = useQuery<BotConfigurationResponse, Error>({
    queryKey: ['bot-config', accessToken],
    queryFn: () => getBotConfig(accessToken as string),
    enabled: Boolean(accessToken),
  })

  const logsQuery = useQuery<BotLogEntry[], Error>({
    queryKey: ['bot-logs', accessToken],
    queryFn: () => getBotLogs(accessToken as string, 50),
    enabled: Boolean(accessToken),
    refetchInterval: 60_000,
  })

  const stateQuery = useQuery<BotStateResponse, Error>({
    queryKey: ['bot-state', accessToken],
    queryFn: () => getBotState(accessToken as string),
    enabled: Boolean(accessToken),
    staleTime: 15_000,
  })

  const updateConfigMutation = useMutation({
    mutationFn: (payload: Partial<{ isEnabled: boolean; autoClaimBait: boolean; autoSellFish: boolean }>) =>
      updateBotConfig(accessToken as string, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['bot-config', accessToken], data)
      queryClient.invalidateQueries({ queryKey: ['user-overview', accessToken] }).catch(() => {})
      toast.success('Configuration updated')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error))
    },
  })

  const manualRunMutation = useMutation({
    mutationFn: () => triggerManualRun(accessToken as string),
    onSuccess: () => {
      toast.success('Manual run queued')
      queryClient.invalidateQueries({ queryKey: ['bot-logs', accessToken] }).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['bot-config', accessToken] }).catch(() => {})
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error))
    },
  })

  const config = configQuery.data
  const overview = overviewQuery.data
  const state = stateQuery.data
  const logs = logsQuery.data ?? []

  const sessionStatus = overview?.bot

  const isLoading = overviewQuery.isLoading || configQuery.isLoading

  const heroGroups = useMemo(() => {
    if (!state?.heroes) {
      return null
    }
    return [
      { label: 'Active', entries: state.heroes.active },
      { label: 'Ready', entries: state.heroes.ready },
      { label: 'Idle', entries: state.heroes.idle },
    ]
  }, [state?.heroes])

  if (!tokens || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect to view your dashboard</CardTitle>
          <CardDescription>
            Authenticate on the landing page to unlock configuration, live state, and logs.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const heroTabs = heroGroups?.map((group) => group) ?? []

  const isErrored = overviewQuery.isError || configQuery.isError

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Account overview
                {sessionStatus?.hasCookie ? (
                  <Badge variant="outline" className="gap-1 text-xs font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Linked
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 text-xs font-medium">
                    <AlertCircle className="h-3 w-3" /> Cookie missing
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Wallet {overview?.user.address ?? '—'} · ID {overview?.user.userId ?? '—'}
              </CardDescription>
            </div>
            {sessionStatus?.renewSoon && (
              <Badge variant="secondary" className="gap-1 text-xs font-medium">
                <CalendarClock className="h-3 w-3" /> Renew session soon
              </Badge>
            )}
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <div className="text-xs uppercase text-muted-foreground">Session</div>
              <div className="rounded-lg border border-border/60 bg-background/50 p-4">
                <div>Game cookie: {sessionStatus?.hasCookie ? 'Linked' : 'Missing'}</div>
                <div>
                  Expires:{' '}
                  {sessionStatus?.expiresAt ? formatDate(sessionStatus.expiresAt) : '—'}{' '}
                  <span className="text-muted-foreground">
                    {sessionStatus?.expiresAt ? `(${formatRelative(sessionStatus.expiresAt)})` : ''}
                  </span>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="h-3 w-3" /> Next check:{' '}
                  {config?.nextCheck?.nextCheckAt ? (
                    <span>
                      {formatDate(config.nextCheck.nextCheckAt)} · {formatRelative(config.nextCheck.nextCheckAt)}
                    </span>
                  ) : (
                    'not scheduled'
                  )}
                </div>
                {config?.nextCheck?.notes?.length ? (
                  <div className="pt-2 text-xs text-muted-foreground">
                    {config.nextCheck.notes.map((note) => (
                      <div key={note}>• {note}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="text-xs uppercase text-muted-foreground">Game profile</div>
              <div className="space-y-1 rounded-lg border border-border/60 bg-background/50 p-4">
                <div>Username: {overview?.sessionUser?.username ?? '—'}</div>
                <div>Public key: {overview?.sessionUser?.publicKey ?? '—'}</div>
                <div>Discord: {overview?.sessionUser?.discordHandle ?? overview?.sessionUser?.discordId ?? '—'}</div>
                <div>Last sign-in: {formatDate(overview?.sessionUser?.lastSignedIn)}</div>
              </div>
            </div>
          </CardContent>
          {isErrored && (
            <CardFooter>
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {overviewQuery.isError
                  ? getErrorMessage(overviewQuery.error)
                  : getErrorMessage(configQuery.error)}
              </Badge>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3">
            <CardTitle>Bot controls</CardTitle>
            <CardDescription>Enable automation and manage helper routines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="bot-enabled" className="text-sm font-medium">
                  Automation enabled
                </Label>
                <p className="text-xs text-muted-foreground">Pause or resume worker execution.</p>
              </div>
              <Switch
                id="bot-enabled"
                checked={config?.isEnabled ?? false}
                onCheckedChange={(checked) => updateConfigMutation.mutate({ isEnabled: checked })}
                disabled={updateConfigMutation.isPending || isLoading || configQuery.isError}
              />
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="bot-auto-claim" className="text-sm font-medium">
                    Auto-claim bait
                  </Label>
                  <p className="text-xs text-muted-foreground">Claim bait stashes during daily reset.</p>
                </div>
                <Switch
                  id="bot-auto-claim"
                  checked={config?.autoClaimBait ?? false}
                  onCheckedChange={(checked) => updateConfigMutation.mutate({ autoClaimBait: checked })}
                  disabled={updateConfigMutation.isPending || isLoading || configQuery.isError}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="bot-auto-sell" className="text-sm font-medium">
                    Auto-sell fish
                  </Label>
                  <p className="text-xs text-muted-foreground">Automatically liquidate fish based on strategy.</p>
                </div>
                <Switch
                  id="bot-auto-sell"
                  checked={config?.autoSellFish ?? false}
                  onCheckedChange={(checked) => updateConfigMutation.mutate({ autoSellFish: checked })}
                  disabled={updateConfigMutation.isPending || isLoading || configQuery.isError}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Last success: {formatDate(config?.lastSuccessAt)}</div>
              <div>Last error: {formatDate(config?.lastErrorAt)}</div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={!config?.isEnabled || manualRunMutation.isPending}
              onClick={() => manualRunMutation.mutate()}
              className="gap-2"
            >
              {manualRunMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Trigger run
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="order-2 lg:order-1">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Live state</CardTitle>
              <CardDescription>
                Snapshot captured {state?.timestamp ? formatRelative(state.timestamp) : '—'}.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => stateQuery.refetch()} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            {stateQuery.isError ? (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" /> {stateQuery.error?.message}
              </div>
            ) : isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading live data…
              </div>
            ) : state ? (
              <Tabs defaultValue="resources" className="space-y-4">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                  <TabsTrigger value="heroes">Heroes</TabsTrigger>
                </TabsList>
                <TabsContent value="resources" className="space-y-4">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Bait balances</div>
                    {renderBadges(state.bait?.balances ?? null)}
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Claimable bait</div>
                    {renderBadges(state.bait?.claimable ?? null)}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                      <div className="text-xs text-muted-foreground">Marbles</div>
                      <div className="text-lg font-semibold">{state.marbles?.balance ?? '—'}</div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                      <div className="text-xs text-muted-foreground">Marble week</div>
                      <div className="text-lg font-semibold">{state.marbles?.week ?? '—'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Fish inventory</div>
                    {renderBadges(state.fish?.regular ?? null)}
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Daily deals</div>
                    {renderBadges(state.fish?.dailyDeals ?? null)}
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Sold today</div>
                    {renderBadges(state.fish?.dealsSoldToday ?? null)}
                  </div>
                </TabsContent>
                <TabsContent value="heroes" className="space-y-4">
                  {heroTabs.length ? (
                    heroTabs.map((group) => (
                      <div key={group.key} className="space-y-3">
                        <div className="text-xs uppercase text-muted-foreground">{group.label}</div>
                        {group.entries.length === 0 ? (
                          <div className="text-xs text-muted-foreground">No heroes in this state.</div>
                        ) : (
                          <div className="space-y-2">
                            {group.entries.map((hero) => (
                              <div
                                key={hero.id}
                                className="rounded-lg border border-border/50 bg-background/50 p-3 text-xs text-muted-foreground"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                                  Hero #{hero.id}
                                  <Badge variant="outline" className="text-xs font-normal">
                                    Energy {hero.energyEstimated ?? hero.energy ?? '—'} / {hero.maxEnergy ?? '—'}
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

        <Card className="order-1 lg:order-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Recent logs</CardTitle>
              <CardDescription>Latest orchestration events and status changes.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => logsQuery.refetch()} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {logsQuery.isError ? (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" /> {logsQuery.error?.message}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No logs yet.</div>
            ) : (
              <ScrollArea className="h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">When</TableHead>
                      <TableHead className="w-40">Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="align-top">
                        <TableCell>
                          <div className="text-xs text-muted-foreground">{formatDate(log.occurredAt)}</div>
                          <div className="text-xs">{formatRelative(log.occurredAt)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-medium">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <pre className="max-h-40 overflow-auto rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
