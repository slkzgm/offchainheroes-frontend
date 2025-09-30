// path: src/components/dashboard/bot-dashboard.tsx
'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { AccountOverviewCard } from '@/components/dashboard/account-overview-card'
import { RuntimeSnapshotCard, type RuntimeStat } from '@/components/dashboard/runtime-snapshot-card'
import { BotControlsCard } from '@/components/dashboard/bot-controls-card'
import { LiveStateCard, type LiveStateHeroGroup } from '@/components/dashboard/live-state-card'
import { LogsCard } from '@/components/dashboard/logs-card'
import { formatDate, formatRelative, getErrorMessage } from '@/components/dashboard/dashboard-utils'

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

  const heroGroups: LiveStateHeroGroup[] = useMemo(() => {
    if (!state?.heroes) return []
    return [
      { key: 'active', label: `Active (${state.heroes.active.length})`, entries: state.heroes.active },
      { key: 'ready', label: `Ready (${state.heroes.ready.length})`, entries: state.heroes.ready },
      { key: 'idle', label: `Idle (${state.heroes.idle.length})`, entries: state.heroes.idle },
    ]
  }, [state?.heroes])

  const runtimeStats: RuntimeStat[] = [
    {
      key: 'next-run',
      label: 'Next scheduled run',
      value: config?.nextCheck?.nextCheckAt ? formatRelative(config.nextCheck.nextCheckAt) : '—',
      hint: config?.nextCheck?.nextCheckAt ? formatDate(config.nextCheck.nextCheckAt) : undefined,
    },
    {
      key: 'last-success',
      label: 'Last successful run',
      value: config?.lastSuccessAt ? formatRelative(config.lastSuccessAt) : '—',
      hint: config?.lastSuccessAt ? formatDate(config.lastSuccessAt) : undefined,
    },
    {
      key: 'last-error',
      label: 'Last error',
      value: config?.lastErrorAt ? formatRelative(config.lastErrorAt) : '—',
      hint: config?.lastErrorAt ? formatDate(config.lastErrorAt) : undefined,
    },
    {
      key: 'hero-count',
      label: 'Active heroes',
      value: state?.heroes?.active.length ?? 0,
      hint: `${(state?.heroes?.ready.length ?? 0) + (state?.heroes?.idle.length ?? 0)} awaiting`,
    },
  ]

  const accountError = overviewQuery.isError
    ? getErrorMessage(overviewQuery.error)
    : configQuery.isError
      ? getErrorMessage(configQuery.error)
      : null

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

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <AccountOverviewCard
          overview={overview}
          sessionStatus={sessionStatus}
          config={config}
          isLoading={isLoading}
          errorMessage={accountError}
        />
        <div className="space-y-6">
          <RuntimeSnapshotCard stats={runtimeStats} />
          <BotControlsCard
            config={config}
            disabled={configQuery.isError}
            isUpdating={updateConfigMutation.isPending}
            isManualRunPending={manualRunMutation.isPending}
            onToggleEnabled={(checked) => updateConfigMutation.mutate({ isEnabled: checked })}
            onToggleAutoClaim={(checked) => updateConfigMutation.mutate({ autoClaimBait: checked })}
            onToggleAutoSell={(checked) => updateConfigMutation.mutate({ autoSellFish: checked })}
            onTriggerRun={() => manualRunMutation.mutate()}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr,2fr]">
        <LiveStateCard
          state={state}
          heroGroups={heroGroups}
          errorMessage={stateQuery.isError ? getErrorMessage(stateQuery.error) : null}
          onRefresh={() => stateQuery.refetch()}
        />
        <LogsCard
          logs={logs}
          isLoading={logsQuery.isLoading}
          errorMessage={logsQuery.isError ? getErrorMessage(logsQuery.error) : null}
          onRefresh={() => logsQuery.refetch()}
        />
      </div>
    </div>
  )
}
