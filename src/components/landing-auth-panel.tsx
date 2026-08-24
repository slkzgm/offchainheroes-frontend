'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { prepareSiwe, verifySiwe, logout as apiLogout } from '@/lib/api'
import { useAbstractWallet } from '@/hooks/use-abstract-wallet'
import { useSession } from '@/hooks/use-session'
import { useI18n } from '@/i18n/client'

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}

export default function LandingAuthPanel() {
  const router = useRouter()
  const { t, buildHref } = useI18n()
  const {
    session,
    isAuthenticated,
    refetch: refetchSession,
    isLoading: sessionLoading,
  } = useSession()
  const {
    address,
    walletClient,
    isAvailable: isConnected,
    isChecking: walletChecking,
    isConnecting: walletMutationPending,
    connectWallet,
    disconnectWallet,
    revalidate: revalidateWallet,
  } = useAbstractWallet()
  const [isHoveringWallet, setIsHoveringWallet] = useState(false)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const dashboardPath = useMemo(() => buildHref('/dashboard'), [buildHref])

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(dashboardPath)
    }
  }, [dashboardPath, isAuthenticated, router])

  const walletButtonLabel = useMemo(() => {
    if (isConnectingWallet || walletChecking || walletMutationPending) {
      return isConnected ? t('landing.wallet.disconnecting') : t('landing.wallet.connecting')
    }
    if (!isConnected || !address) {
      return t('common.actions.connectWallet')
    }
    if (isHoveringWallet) {
      return t('common.actions.disconnectWallet')
    }
    return `${address.slice(0, 6)}…${address.slice(-4)}`
  }, [
    address,
    isConnected,
    isConnectingWallet,
    isHoveringWallet,
    t,
    walletChecking,
    walletMutationPending,
  ])

  const handleConnect = useCallback(async () => {
    if (isConnected) return
    try {
      setIsConnectingWallet(true)
      await connectWallet()
      toast.success(t('common.feedback.walletConnected'))
    } catch (error) {
      toast.error(getErrorMessage(error, t('common.errors.walletConnectFailed')))
    } finally {
      setIsConnectingWallet(false)
    }
  }, [connectWallet, isConnected, t])

  const handleDisconnect = useCallback(async () => {
    try {
      setIsConnectingWallet(true)
      if (isAuthenticated) {
        await apiLogout().catch(() => {})
        await refetchSession()
      }
      await disconnectWallet()
      toast.success(t('common.feedback.walletDisconnected'))
    } catch (error) {
      toast.error(getErrorMessage(error, t('common.errors.walletDisconnectFailed')))
    } finally {
      setIsConnectingWallet(false)
    }
  }, [disconnectWallet, isAuthenticated, refetchSession, t])

  const handleSignIn = useCallback(async () => {
    if (!(await revalidateWallet()) || !walletClient) {
      toast.error(t('common.errors.connectWalletFirst'))
      return
    }

    try {
      setIsSigningIn(true)
      const chainId = Number(await walletClient.getChainId())
      const walletAddress = walletClient.account?.address ?? address

      if (!walletAddress) {
        throw new Error(t('common.errors.missingWalletAddress'))
      }

      const account = walletClient.account ?? (walletAddress as `0x${string}`)
      const prepared = await prepareSiwe({ address: walletAddress, chainId })
      const signature = await walletClient.signMessage({ account, message: prepared.message })
      await verifySiwe({ message: prepared.message, signature })
      await refetchSession()
      toast.success(t('common.feedback.loginSuccess'))
    } catch (error) {
      toast.error(getErrorMessage(error, t('common.errors.loginFailed')))
    } finally {
      setIsSigningIn(false)
    }
  }, [address, walletClient, refetchSession, revalidateWallet, t])

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
    [isConnected]
  )

  const sessionStatusText = sessionLoading
    ? t('common.status.checkingSession')
    : isAuthenticated
      ? t('common.status.signedInAs', { address: session?.address ?? '' })
      : t('common.status.notSignedIn')

  const walletStatusText =
    isConnected && address
      ? t('common.status.walletConnected', {
          address: `${address.slice(0, 6)}…${address.slice(-4)}`,
        })
      : t('common.status.walletNotConnected')

  return (
    <section className="space-y-6 rounded-2xl border border-border/80 bg-background/70 p-10 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t('landing.header.heroHeading')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('landing.header.heroDescription')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isConnectingWallet || walletChecking || walletMutationPending}
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
          {walletStatusText}
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
          {sessionStatusText}
        </div>
        <Button
          size="lg"
          className="w-full justify-center"
          disabled={!isConnected || isSigningIn || walletChecking}
          onClick={() => void handleSignIn()}
        >
          {isSigningIn ? t('landing.session.signingIn') : t('common.actions.login')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('common.info.sessionSecurity')}</p>
      </div>
    </section>
  )
}
