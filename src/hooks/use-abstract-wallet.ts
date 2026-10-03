'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useConfig, useDisconnect } from 'wagmi'
import { getAccount, getConnections } from 'wagmi/actions'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { readAbstractWalletConnection } from '@/lib/abstract-wallet-connection'
import { signWalletMessage } from '@/lib/wallet-signing'
import { ABSTRACT_CONNECTOR_ID } from '@/lib/wallet-config'

const MAX_TIMEOUT_MS = 2_147_000_000

type WalletHealth = 'checking' | 'connected' | 'disconnected' | 'expired'

export function useAbstractWallet() {
  const account = useAccount()
  const config = useConfig()
  const { openConnectModal } = useConnectModal()
  const { disconnectAsync, isPending: isDisconnectPending } = useDisconnect()
  const [health, setHealth] = useState<WalletHealth>('checking')

  const wagmiConnected = account.status === 'connected' && Boolean(account.address)
  const signerAddress = account.addresses?.[1]
  const isAgw =
    account.connector?.id === ABSTRACT_CONNECTOR_ID || account.connector?.id === 'abstract'

  const markConnectionExpired = useCallback(async () => {
    const current = getAccount(config)
    if (
      current.connector?.uid !== account.connector?.uid ||
      current.address?.toLowerCase() !== account.address?.toLowerCase()
    )
      return
    setHealth('expired')
    if (!account.connector) return
    await disconnectAsync({ connector: account.connector }).catch(() => {})
  }, [account.address, account.connector, config, disconnectAsync])

  useEffect(() => {
    if (!wagmiConnected || !isAgw) return

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    const clearExpiryTimer = () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      timeoutId = undefined
    }

    const synchronize = () => {
      if (cancelled) return
      clearExpiryTimer()

      const snapshot = readAbstractWalletConnection(window.localStorage, signerAddress)
      if (snapshot.status === 'expired') {
        void markConnectionExpired()
        return
      }

      setHealth('connected')
      if (snapshot.status !== 'active') return

      const delay = Math.min(Math.max(snapshot.expiresAt - Date.now() + 100, 0), MAX_TIMEOUT_MS)
      timeoutId = setTimeout(synchronize, delay)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') synchronize()
    }
    const onStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('privy-caw:')) synchronize()
    }

    queueMicrotask(synchronize)
    window.addEventListener('focus', synchronize)
    window.addEventListener('storage', onStorageChange)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      clearExpiryTimer()
      window.removeEventListener('focus', synchronize)
      window.removeEventListener('storage', onStorageChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isAgw, markConnectionExpired, signerAddress, wagmiConnected])

  const revalidate = useCallback(async (): Promise<boolean> => {
    if (!wagmiConnected || !account.connector || !account.address) return false

    if (isAgw) {
      const snapshot = readAbstractWalletConnection(window.localStorage, signerAddress)
      if (snapshot.status === 'expired') {
        await markConnectionExpired()
        return false
      }
    }

    try {
      const accounts = await account.connector.getAccounts()
      if (accounts.length === 0) {
        await markConnectionExpired()
        return false
      }
      const current = getAccount(config)
      if (
        accounts[0]?.toLowerCase() !== account.address.toLowerCase() ||
        current.address?.toLowerCase() !== account.address.toLowerCase() ||
        current.connector?.uid !== account.connector.uid ||
        current.status !== 'connected'
      ) {
        return false
      }
    } catch {
      await markConnectionExpired()
      return false
    }

    setHealth('connected')
    return true
  }, [
    account.address,
    account.connector,
    config,
    isAgw,
    markConnectionExpired,
    signerAddress,
    wagmiConnected,
  ])

  const disconnectWallet = useCallback(async () => {
    await Promise.all(getConnections(config).map(({ connector }) => disconnectAsync({ connector })))
    await config.storage?.removeItem('recentConnectorId')
    setHealth('disconnected')
  }, [config, disconnectAsync])

  const connectWallet = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!openConnectModal) throw new Error('Wallet picker is not ready. Please try again.')

      if (account.connector && wagmiConnected) {
        if (!options.force) {
          const stillAvailable = await revalidate()
          if (stillAvailable) return
        }
        await disconnectWallet()
      }

      openConnectModal()
    },
    [account.connector, disconnectWallet, openConnectModal, revalidate, wagmiConnected]
  )

  const signMessage = useCallback(
    async (message: string) => {
      if (!(await revalidate())) throw new Error('Reconnect your wallet before signing.')
      return signWalletMessage(config, message)
    },
    [config, revalidate]
  )

  const walletHealth =
    wagmiConnected && !isAgw
      ? 'connected'
      : !wagmiConnected && health !== 'expired'
        ? 'disconnected'
        : health
  const isChecking =
    walletHealth === 'checking' ||
    account.status === 'connecting' ||
    account.status === 'reconnecting'
  const isAvailable = walletHealth === 'connected' && wagmiConnected

  return useMemo(
    () => ({
      address: account.address,
      addresses: account.addresses,
      signMessage,
      health: walletHealth,
      isAvailable,
      isChecking,
      isExpired: walletHealth === 'expired',
      isConnected: wagmiConnected,
      isConnecting: account.status === 'connecting' || isDisconnectPending,
      connectWallet,
      disconnectWallet,
      revalidate,
    }),
    [
      account.address,
      account.addresses,
      connectWallet,
      disconnectWallet,
      isAvailable,
      isChecking,
      account.status,
      isDisconnectPending,
      revalidate,
      wagmiConnected,
      signMessage,
      walletHealth,
    ]
  )
}
