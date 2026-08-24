'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useWalletClient } from 'wagmi'
import { readAbstractWalletConnection } from '@/lib/abstract-wallet-connection'

const ABSTRACT_CONNECTOR_ID = 'xyz.abs.privy'
const MAX_TIMEOUT_MS = 2_147_000_000

type WalletHealth = 'checking' | 'connected' | 'disconnected' | 'expired'

export function useAbstractWallet() {
  const account = useAccount()
  const { data: walletClient } = useWalletClient()
  const { connectors, connectAsync, isPending: isConnectPending } = useConnect()
  const { disconnectAsync, isPending: isDisconnectPending } = useDisconnect()
  const [health, setHealth] = useState<WalletHealth>('checking')

  const wagmiConnected = account.status === 'connected' && Boolean(account.address)
  const signerAddress = account.addresses?.[1]

  const markConnectionExpired = useCallback(async () => {
    setHealth('expired')
    if (!account.connector) return
    await disconnectAsync({ connector: account.connector }).catch(() => {})
  }, [account.connector, disconnectAsync])

  useEffect(() => {
    if (!wagmiConnected) return

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
  }, [markConnectionExpired, signerAddress, wagmiConnected])

  const revalidate = useCallback(async (): Promise<boolean> => {
    if (!wagmiConnected || !account.connector || !walletClient) return false

    const snapshot = readAbstractWalletConnection(window.localStorage, signerAddress)
    if (snapshot.status === 'expired') {
      await markConnectionExpired()
      return false
    }

    try {
      const accounts = await account.connector.getAccounts()
      if (accounts.length === 0) {
        await markConnectionExpired()
        return false
      }
    } catch {
      await markConnectionExpired()
      return false
    }

    setHealth('connected')
    return true
  }, [account.connector, markConnectionExpired, signerAddress, wagmiConnected, walletClient])

  const connectWallet = useCallback(
    async (options: { force?: boolean } = {}) => {
      setHealth('checking')

      if (account.connector && wagmiConnected) {
        if (!options.force) {
          const stillAvailable = await revalidate()
          if (stillAvailable) return
        }
        await disconnectAsync({ connector: account.connector }).catch(() => {})
      }

      const connector = connectors.find((candidate) => candidate.id === ABSTRACT_CONNECTOR_ID)
      if (!connector) {
        setHealth('disconnected')
        throw new Error('Abstract connector not found')
      }

      try {
        await connectAsync({ connector })
        setHealth('connected')
      } catch (error) {
        setHealth('disconnected')
        throw error
      }
    },
    [account.connector, connectAsync, connectors, disconnectAsync, revalidate, wagmiConnected]
  )

  const disconnectWallet = useCallback(async () => {
    setHealth('disconnected')
    if (!account.connector) return
    await disconnectAsync({ connector: account.connector })
  }, [account.connector, disconnectAsync])

  const walletHealth = !wagmiConnected && health !== 'expired' ? 'disconnected' : health
  const isChecking = walletHealth === 'checking' || (wagmiConnected && !walletClient)
  const isAvailable = walletHealth === 'connected' && wagmiConnected && Boolean(walletClient)

  return useMemo(
    () => ({
      address: account.address,
      addresses: account.addresses,
      walletClient,
      health: walletHealth,
      isAvailable,
      isChecking,
      isExpired: walletHealth === 'expired',
      isConnected: wagmiConnected,
      isConnecting: isConnectPending || isDisconnectPending,
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
      isConnectPending,
      isDisconnectPending,
      revalidate,
      wagmiConnected,
      walletClient,
      walletHealth,
    ]
  )
}
