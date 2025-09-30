// path: src/components/landing-auth-panel.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLoginWithAbstract } from '@abstract-foundation/agw-react'
import { useAccount, useWalletClient } from 'wagmi'
import { Button } from '@/components/ui/button'
import { prepareSiwe, verifySiwe, logout as apiLogout } from '@/lib/api'
import { useSession } from '@/hooks/use-session'

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}

export default function LandingAuthPanel() {
  const router = useRouter()
  const { session, isAuthenticated, refetch: refetchSession, isLoading: sessionLoading } = useSession()
  const { login, logout: logoutWallet } = useLoginWithAbstract()
  const { address, status: connectionStatus } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [isHoveringWallet, setIsHoveringWallet] = useState(false)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, router])

  const isConnected = connectionStatus === 'connected' && Boolean(address)

  const walletButtonLabel = useMemo(() => {
    if (isConnectingWallet) {
      return isConnected ? 'Disconnecting…' : 'Connecting…'
    }
    if (!isConnected || !address) {
      return 'Connect Abstract Wallet'
    }
    if (isHoveringWallet) {
      return 'Disconnect wallet'
    }
    return `${address.slice(0, 6)}…${address.slice(-4)}`
  }, [address, isConnected, isConnectingWallet, isHoveringWallet])

  const handleConnect = useCallback(async () => {
    if (isConnected) return
    try {
      setIsConnectingWallet(true)
      await Promise.resolve(login())
      toast.success('Wallet connected')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to connect wallet'))
    } finally {
      setIsConnectingWallet(false)
    }
  }, [isConnected, login])

  const handleDisconnect = useCallback(async () => {
    try {
      setIsConnectingWallet(true)
      if (isAuthenticated) {
        await apiLogout().catch(() => {})
        await refetchSession()
      }
      await Promise.resolve(logoutWallet())
      toast.success('Wallet disconnected')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to disconnect wallet'))
    } finally {
      setIsConnectingWallet(false)
    }
  }, [isAuthenticated, logoutWallet, refetchSession])

  const handleSignIn = useCallback(async () => {
    if (!isConnected || !walletClient) {
      toast.error('Connect Abstract Global Wallet first')
      return
    }

    try {
      setIsSigningIn(true)
      const chainId = Number(await walletClient.getChainId())
      const walletAddress = walletClient.account?.address ?? address

      if (!walletAddress) {
        throw new Error('No connected wallet address found')
      }

      const account = walletClient.account ?? (walletAddress as `0x${string}`)
      const prepared = await prepareSiwe({ address: walletAddress, chainId })
      const signature = await walletClient.signMessage({ account, message: prepared.message })
      await verifySiwe({ message: prepared.message, signature })
      await refetchSession()
      toast.success('Login successful')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to login'))
    } finally {
      setIsSigningIn(false)
    }
  }, [address, isConnected, walletClient, refetchSession])

  const onWalletButtonClick = useCallback(() => {
    if (isConnected) {
      void handleDisconnect()
    } else {
      void handleConnect()
    }
  }, [handleConnect, handleDisconnect, isConnected])

  const onWalletHoverChange = useCallback(
    (hovering: boolean) => {
      if (!isConnected) return
      setIsHoveringWallet(hovering)
    },
    [isConnected],
  )

  const sessionStatusText = sessionLoading
    ? 'Checking session…'
    : isAuthenticated
      ? `Signed in as ${session?.address}`
      : 'Not signed in'

  return (
    <section className="space-y-6 rounded-2xl border border-border/80 bg-background/70 p-10 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Access your automation dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Abstract wallet, then authenticate to unlock strategy management and live metrics.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isConnectingWallet}
          onClick={onWalletButtonClick}
          onMouseEnter={() => onWalletHoverChange(true)}
          onMouseLeave={() => onWalletHoverChange(false)}
          className="min-w-[12rem] justify-center"
        >
          {walletButtonLabel}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
          {isConnected && address
            ? `Wallet connected: ${address.slice(0, 6)}…${address.slice(-4)}`
            : 'Wallet not connected'}
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
          {sessionStatusText}
        </div>
        <Button
          size="lg"
          className="w-full justify-center"
          disabled={!isConnected || isSigningIn}
          onClick={() => void handleSignIn()}
        >
          {isSigningIn ? 'Signing in…' : 'Login to app'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Sessions are stored securely in HttpOnly cookies. Disconnecting your wallet clears the session immediately.
        </p>
      </div>
    </section>
  )
}
