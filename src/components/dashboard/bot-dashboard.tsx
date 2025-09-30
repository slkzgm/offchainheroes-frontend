'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
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

function formatRecord(record?: Record<string, number> | Record<string, unknown> | null): string {
  if (!record || Object.keys(record).length === 0) return '—'
  return Object.entries(record)
    .map(([key, value]) => `${key}=${value as string | number}`)
    .join(', ')
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
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Connect and sign in to load bot data.
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading bot data…</div>
  }

  if (overviewQuery.isError) {
    return <div className="text-sm text-red-600">Failed to load overview: {overviewQuery.error?.message}</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border p-4">
        <h2 className="text-base font-semibold">Account</h2>
        <div className="mt-2 space-y-1 text-sm">
          <div>Address: {overview?.user.address ?? '—'}</div>
          <div>User ID: {overview?.user.userId ?? '—'}</div>
          <div>
            Game session: {sessionStatus?.hasCookie ? 'linked' : 'missing'}
            {sessionStatus?.expiresAt ? ` — expires ${formatDate(sessionStatus.expiresAt)}` : ''}
          </div>
          {sessionStatus?.renewSoon && (
            <div className="text-amber-600">Session renewal recommended soon.</div>
          )}
          {overview?.sessionUser && (
            <div className="pt-2">
              <div className="font-medium">Game profile</div>
              <div className="text-xs text-muted-foreground">
                {overview.sessionUser.username ?? overview.sessionUser.publicKey ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground">
                Discord: {overview.sessionUser.discordHandle ?? overview.sessionUser.discordId ?? '—'}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Configuration</h2>
          <Button
            variant="secondary"
            disabled={!config?.isEnabled || manualRunMutation.isPending}
            onClick={() => manualRunMutation.mutate()}
          >
            Trigger manual run
          </Button>
        </div>
        {configQuery.isError ? (
          <div className="text-sm text-red-600">Failed to load configuration: {configQuery.error?.message}</div>
        ) : (
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config?.isEnabled ?? false}
                onChange={(event) =>
                  updateConfigMutation.mutate({ isEnabled: event.currentTarget.checked })
                }
                disabled={updateConfigMutation.isPending}
              />
              Enable bot
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config?.autoClaimBait ?? false}
                onChange={(event) =>
                  updateConfigMutation.mutate({ autoClaimBait: event.currentTarget.checked })
                }
                disabled={updateConfigMutation.isPending}
              />
              Auto-claim bait
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config?.autoSellFish ?? false}
                onChange={(event) =>
                  updateConfigMutation.mutate({ autoSellFish: event.currentTarget.checked })
                }
                disabled={updateConfigMutation.isPending}
              />
              Auto-sell fish
            </label>
            <div className="pt-2 text-xs text-muted-foreground">
              <div>Last success: {formatDate(config?.lastSuccessAt)}</div>
              <div>Last error: {formatDate(config?.lastErrorAt)}</div>
              <div>
                Next check:{' '}
                {config?.nextCheck?.nextCheckAt ? (
                  <>
                    {formatDate(config.nextCheck.nextCheckAt)} ({formatRelative(config.nextCheck.nextCheckAt)})
                  </>
                ) : (
                  'not scheduled'
                )}
              </div>
              {config?.nextCheck?.notes?.length ? (
                <div>Notes: {config.nextCheck.notes.join(', ')}</div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Live state</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => stateQuery.refetch()}>
              Refresh state
            </Button>
          </div>
        </div>
        {stateQuery.isError ? (
          <div className="text-sm text-red-600">Failed to load live state: {stateQuery.error?.message}</div>
        ) : state ? (
          <div className="space-y-2 text-sm">
            <div>Snapshot: {formatDate(state.timestamp)}</div>
            <div>
              Bait balance:{' '}
              {formatRecord(state.bait?.balances as Record<string, number> | undefined)}
            </div>
            <div>Claimable: {formatRecord(state.bait?.claimable as Record<string, number> | undefined)}</div>
            <div>Marbles: {state.marbles?.balance ?? '—'}</div>
            <div>Fish (regular): {formatRecord(state.fish?.regular ?? undefined)}</div>
            <div>Fish (daily deals): {formatRecord(state.fish?.dailyDeals ?? undefined)}</div>
            <div>Fish sold today: {formatRecord(state.fish?.dealsSoldToday ?? undefined)}</div>
            {heroGroups?.map((group) => (
              <div key={group.label}>
                <div className="font-medium">{group.label} heroes ({group.entries.length})</div>
                <div className="ml-4 space-y-1 text-xs text-muted-foreground">
                  {group.entries.length === 0 && <div>None</div>}
                  {group.entries.map((hero) => (
                    <div key={hero.id}>
                      <div>
                        #{hero.id} — energy {hero.energyEstimated ?? hero.energy ?? '—'} / {hero.maxEnergy ?? '—'}
                        {hero.activeSession?.matureAt && (
                          <span>
                            {' '}
                            (matures {formatRelative(hero.activeSession.matureAt)})
                          </span>
                        )}
                      </div>
                      {hero.activeSession && (
                        <div className="text-[11px] text-muted-foreground">
                          Elapsed {formatDuration(hero.activeSession.elapsedSeconds)} · Zone{' '}
                          {hero.activeSession.zoneId ?? '—'} · Bait{' '}
                          {hero.activeSession.bait ? hero.activeSession.bait : 'none'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No live data available.</div>
        )}
      </section>

      <section className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent logs</h2>
          <Button variant="outline" size="sm" onClick={() => logsQuery.refetch()}>
            Refresh logs
          </Button>
        </div>
        {logsQuery.isError ? (
          <div className="text-sm text-red-600">Failed to load logs: {logsQuery.error?.message}</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No logs yet.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {logs.map((log) => (
              <li key={log.id} className="rounded border p-2">
                <div className="text-xs text-muted-foreground">{formatDate(log.occurredAt)}</div>
                <div className="font-medium">{log.action}</div>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
