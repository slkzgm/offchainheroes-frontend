// path: src/components/dashboard/bot-dashboard.tsx
'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/hooks/use-session'
import {
  getUserOverview,
  getBotConfig,
  updateBotConfig,
  triggerManualRun,
  getBotLogs,
  getBotActivity,
  getBotState,
  type BotConfigurationResponse,
  type BotStateResponse,
  type BotLogEntry,
  type BotActivityEntry,
  type UserOverviewResponse,
} from '@/lib/api'
import { toast } from 'sonner'
import { RuntimeSnapshotCard, type RuntimeStat } from '@/components/dashboard/runtime-snapshot-card'
import { BotControlsCard } from '@/components/dashboard/bot-controls-card'
import { LiveStateCard, type LiveStateHeroGroup } from '@/components/dashboard/live-state-card'
import { LogsCard } from '@/components/dashboard/logs-card'
import { ActivityCard } from '@/components/dashboard/activity-card'
import { formatDate, formatRelative, getErrorMessage } from '@/lib/format'
import { BotSessionCard } from '@/components/dashboard/bot-session-card'

export default function BotDashboard() {
  const { session, isAuthenticated, isLoading: sessionLoading } = useSession()
  const queryClient = useQueryClient()

  const overviewQuery = useQuery<UserOverviewResponse, Error>({
    queryKey: ['user-overview', session?.userId],
    queryFn: () => getUserOverview(),
    enabled: isAuthenticated,
  })

  const configQuery = useQuery<BotConfigurationResponse, Error>({
    queryKey: ['bot-config', session?.userId],
    queryFn: () => getBotConfig(),
    enabled: isAuthenticated,
  })

  const logsQuery = useQuery<BotLogEntry[], Error>({
    queryKey: ['bot-logs', session?.userId],
    queryFn: () => getBotLogs(50),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  })

  const activityQuery = useQuery<BotActivityEntry[], Error>({
    queryKey: ['bot-activity', session?.userId],
    queryFn: () => getBotActivity(25),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  })

  const stateQuery = useQuery<BotStateResponse, Error>({
    queryKey: ['bot-state', session?.userId],
    queryFn: () => getBotState(),
    enabled: isAuthenticated,
    staleTime: 15_000,
  })

  const updateConfigMutation = useMutation({
    mutationFn: (payload: Partial<{ isEnabled: boolean; autoClaimBait: boolean; autoSellFish: boolean }>) =>
      updateBotConfig(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['bot-config', session?.userId], data)
      queryClient.invalidateQueries({ queryKey: ['user-overview', session?.userId] }).catch(() => {})
      toast.success('Configuration updated')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error))
    },
  })

  const manualRunMutation = useMutation({
    mutationFn: () => triggerManualRun(),
    onSuccess: () => {
      toast.success('Manual run queued')
      queryClient.invalidateQueries({ queryKey: ['bot-logs', session?.userId] }).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['bot-activity', session?.userId] }).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['bot-config', session?.userId] }).catch(() => {})
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error))
    },
  })

  const config = configQuery.data
  const overview = overviewQuery.data
  const state = stateQuery.data
  const logs = logsQuery.data ?? []
  const activities = activityQuery.data ?? []

  const sessionStatus = overview?.bot
  const isSessionLoading = overviewQuery.isLoading || configQuery.isLoading

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

  const handleSessionUpdated = useCallback(async () => {
    await Promise.allSettled([overviewQuery.refetch(), configQuery.refetch(), stateQuery.refetch()])
  }, [configQuery, overviewQuery, stateQuery])

  if (sessionLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading session…</CardTitle>
          <CardDescription>Checking authentication status.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isAuthenticated) {
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
      <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
        <BotSessionCard
          status={sessionStatus}
          config={config}
          isLoading={isSessionLoading}
          onSessionUpdated={handleSessionUpdated}
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
        <ActivityCard
          activities={activities}
          isLoading={activityQuery.isLoading}
          errorMessage={activityQuery.isError ? getErrorMessage(activityQuery.error) : null}
          onRefresh={() => activityQuery.refetch()}
        />
      </div>

      <LogsCard
        logs={logs}
        isLoading={logsQuery.isLoading}
        errorMessage={logsQuery.isError ? getErrorMessage(logsQuery.error) : null}
        onRefresh={() => logsQuery.refetch()}
      />
    </div>
  )
}
