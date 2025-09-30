'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  prepareSiwe,
  verifySiwe,
  prepareBotSession,
  verifyBotSession,
  getBotSessionStatus,
  me,
  saveTokens,
  loadTokens,
  clearTokens,
  refresh,
  type BotSessionStatus,
} from '@/lib/api'
import { useLoginWithAbstract } from '@abstract-foundation/agw-react'
import { useAccount, useWalletClient } from 'wagmi'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}

export default function SiweLogin() {
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [gameStatus, setGameStatus] = useState('')
  const [botStatus, setBotStatus] = useState<BotSessionStatus | null>(null)
  const { login, logout: logoutFromAbstract } = useLoginWithAbstract()
  const { address, status: connectionStatus } = useAccount()
  const { data: walletClient } = useWalletClient()

  const connect = useCallback(async () => {
    try {
      setLoading(true)
      await Promise.resolve(login())
      toast.success('Wallet connected')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to connect wallet'))
    } finally {
      setLoading(false)
    }
  }, [login])

  const signIn = useCallback(async () => {
    if (connectionStatus !== 'connected' || !walletClient) {
      toast.error('Connect Abstract Global Wallet first')
      return
    }
    try {
      setLoading(true)
      const chainId = Number(await walletClient.getChainId())
      const walletAddress = walletClient.account?.address ?? address

      if (!walletAddress) {
        toast.error('No connected wallet address found')
        return
      }

      const account = walletClient.account ?? (walletAddress as `0x${string}`)

      const prepared = await prepareSiwe({ address: walletAddress, chainId })
      const message = prepared.message

      const signature = await walletClient.signMessage({ account, message })

      const tokens = await verifySiwe({ message, signature })
      saveTokens(tokens)
      toast.success('Signed in with SIWE')
      setStatusMessage(`Signed in as ${tokens.address}`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed SIWE sign in'))
    } finally {
      setLoading(false)
    }
  }, [address, connectionStatus, walletClient])

  const linkGameSession = useCallback(async () => {
    if (connectionStatus !== 'connected' || !walletClient) {
      toast.error('Connect Abstract Global Wallet first')
      return
    }

    const tokens = loadTokens()
    if (!tokens) {
      toast.error('Sign in before linking game session')
      return
    }

    try {
      setLoading(true)
      const prepared = await prepareBotSession(tokens.accessToken)

      const walletAddress = walletClient.account?.address ?? address
      if (!walletAddress) {
        toast.error('No connected wallet account found')
        return
      }

      const account = walletClient.account ?? (walletAddress as `0x${string}`)

      const signature = await walletClient.signMessage({
        account,
        message: prepared.message,
      })

      const result = await verifyBotSession(tokens.accessToken, {
        message: prepared.message,
        signature,
      })

      const cookieLabel = result.cookieNames.length ? result.cookieNames.join(', ') : 'session cookie'
      setGameStatus(`Game session linked (${cookieLabel})`)
      // Refresh status after linking
      try {
        const status = await getBotSessionStatus(tokens.accessToken)
        setBotStatus(status)
      } catch {}
      toast.success('Game session linked')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to link game session'))
    } finally {
      setLoading(false)
    }
  }, [address, connectionStatus, walletClient])

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true)
      const tokens = loadTokens()
      if (!tokens) return toast.error('No tokens saved')
      try {
        const res = await me(tokens.accessToken)
        setStatusMessage(`User: ${res.address} (id: ${res.userId})`)
      } catch {
        // try refresh once
        const newAccess = await refresh(tokens.refreshToken)
        const merged = { ...tokens, accessToken: newAccess.accessToken }
        saveTokens(merged)
        const res = await me(merged.accessToken)
        setStatusMessage(`User: ${res.address} (id: ${res.userId})`)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to fetch profile'))
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      clearTokens()
      await Promise.resolve(logoutFromAbstract())
      setStatusMessage('')
      setGameStatus('')
      toast.success('Logged out')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to logout'))
    } finally {
      setLoading(false)
    }
  }, [logoutFromAbstract])

  useEffect(() => {
    const tokens = loadTokens()
    if (tokens) {
      setStatusMessage(`Signed in as ${tokens.address}`)
      // fetch initial bot session status
      getBotSessionStatus(tokens.accessToken)
        .then((status) => setBotStatus(status))
        .catch(() => setBotStatus(null))
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">{statusMessage || 'Not signed in'}</div>
      <div className="text-xs text-muted-foreground">
        {botStatus?.hasCookie
          ? `Game cookie: ${botStatus.expiresAt ? `expires ${new Date(botStatus.expiresAt).toLocaleString()}` : 'no expiry found'}${botStatus.renewSoon ? ' — renew soon' : ''}`
          : gameStatus || 'Game session not linked'}
      </div>
      <div className="flex gap-2">
        <Button onClick={connect} disabled={loading} variant="outline">
          {connectionStatus === 'connected' && address ? `Connected: ${address.slice(0, 6)}…` : 'Connect Abstract Wallet'}
        </Button>
        <Button onClick={signIn} disabled={loading}>
          Sign In with Ethereum
        </Button>
        <Button onClick={fetchMe} disabled={loading} variant="secondary">
          Me
        </Button>
        <Button onClick={linkGameSession} disabled={loading} variant="secondary">
          {botStatus?.expired || botStatus?.renewSoon ? 'Renew Game Session' : 'Link Game Session'}
        </Button>
        <Button onClick={logout} disabled={loading} variant="destructive">
          Logout
        </Button>
      </div>
    </div>
  )
}
