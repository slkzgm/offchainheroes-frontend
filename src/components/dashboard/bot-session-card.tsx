// path: src/components/dashboard/bot-session-card.tsx
'use client'

import { useCallback, useMemo, useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { BotConfigurationResponse, BotSessionStatus } from '@/lib/api'
import { prepareBotSession, verifyBotSession } from '@/lib/api'
import { formatDate, formatRelative, getErrorMessage } from '@/lib/format'
import { Loader2, Plug, RefreshCcw } from 'lucide-react'

interface BotSessionCardProps {
  status?: BotSessionStatus
  config?: BotConfigurationResponse
  isLoading: boolean
  onSessionUpdated?: () => Promise<unknown> | void
}

export function BotSessionCard({ status, config, isLoading, onSessionUpdated }: BotSessionCardProps) {
  const { status: walletStatus, address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [isProcessing, setIsProcessing] = useState(false)

  const walletConnected = walletStatus === 'connected' && Boolean(address)

  const sessionBadge = useMemo(() => {
    if (!status?.hasCookie) {
      return { variant: 'destructive' as const, label: 'Not linked' }
    }
    if (status.expired) {
      return { variant: 'destructive' as const, label: 'Expired' }
    }
    if (status.renewSoon) {
      return { variant: 'secondary' as const, label: 'Expiring soon' }
    }
    return { variant: 'default' as const, label: 'Active' }
  }, [status])

  const expiresLabel = useMemo(() => {
    if (!status?.expiresAt) return '—'
    const relative = formatRelative(status.expiresAt)
    return relative ? `${formatDate(status.expiresAt)} · ${relative}` : formatDate(status.expiresAt)
  }, [status?.expiresAt])

  const nextCheckLabel = useMemo(() => {
    const nextAt = config?.nextCheck?.nextCheckAt
    if (!nextAt) return 'Not scheduled'
    const relative = formatRelative(nextAt)
    return relative ? `${formatDate(nextAt)} · ${relative}` : formatDate(nextAt)
  }, [config?.nextCheck?.nextCheckAt])

  const guidance = useMemo(() => {
    if (!status?.hasCookie) return 'Link your Onchain Heroes session cookie to enable automation runs.'
    if (status.expired) return 'Session expired. Renew now to resume automated actions.'
    if (status.renewSoon) {
      const minutes = Math.max(1, Math.round((status.renewAheadSeconds ?? 0) / 60))
      return `Session will expire soon. Renew within ${minutes} minute${minutes > 1 ? 's' : ''}.`
    }
    return 'Session active. Renew anytime to rotate credentials proactively.'
  }, [status])

  const handleLinkSession = useCallback(async () => {
    if (!walletConnected || !walletClient) {
      toast.error('Connect your Abstract wallet to perform this action.')
      return
    }

    try {
      setIsProcessing(true)
      const prepared = await prepareBotSession()
      const account = walletClient.account ?? (address as `0x${string}` | undefined)
      if (!account) {
        throw new Error('No connected wallet account found')
      }
      const signature = await walletClient.signMessage({ account, message: prepared.message })
      await verifyBotSession({ message: prepared.message, signature })
      toast.success(status?.hasCookie ? 'Session renewed successfully' : 'Session linked successfully')
      await onSessionUpdated?.()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsProcessing(false)
    }
  }, [address, onSessionUpdated, status?.hasCookie, walletClient, walletConnected])

  const actionLabel = status?.hasCookie ? 'Renew session' : 'Link session'
  const actionIcon = status?.hasCookie ? <RefreshCcw className="h-4 w-4" /> : <Plug className="h-4 w-4" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Game session</CardTitle>
        <CardDescription>Authenticate with the game and keep the cookie fresh.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking session status…
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={sessionBadge.variant} className="text-xs font-medium">
                {sessionBadge.label}
              </Badge>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-4">
              <InfoRow label="Expires" value={expiresLabel} />
              <InfoRow label="Next automation check" value={nextCheckLabel} />
            </div>
            <p className="text-xs text-muted-foreground">{guidance}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          className="w-full gap-2 sm:w-auto"
          onClick={() => void handleLinkSession()}
          disabled={isProcessing || !walletConnected || isLoading}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : actionIcon}
          {actionLabel}
        </Button>
        <span className="text-xs text-muted-foreground sm:text-right">
          {walletConnected ? 'Signature uses the connected wallet.' : 'Connect wallet to enable session actions.'}
        </span>
      </CardFooter>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
