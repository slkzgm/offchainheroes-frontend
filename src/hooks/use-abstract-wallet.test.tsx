import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAbstractWallet } from './use-abstract-wallet'

const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  connections: vi.fn(),
  disconnect: vi.fn(),
  open: vi.fn(),
  sign: vi.fn(),
  config: { storage: { removeItem: vi.fn() } },
}))
vi.mock('wagmi', () => ({
  useAccount: mocks.account,
  useConfig: () => mocks.config,
  useDisconnect: () => ({ disconnectAsync: mocks.disconnect, isPending: false }),
}))
vi.mock('wagmi/actions', () => ({ getAccount: mocks.account, getConnections: mocks.connections }))
vi.mock('@rainbow-me/rainbowkit', () => ({
  useConnectModal: () => ({ openConnectModal: mocks.open }),
}))
vi.mock('@/lib/wallet-config', () => ({ ABSTRACT_CONNECTOR_ID: 'xyz.abs.privy' }))
vi.mock('@/lib/wallet-signing', () => ({ signWalletMessage: mocks.sign }))

const address = '0x1111111111111111111111111111111111111111'
const signer = '0x2222222222222222222222222222222222222222'
const connector = { id: 'injected', uid: 'eoa-1', getAccounts: vi.fn() }
let current: {
  status: string
  address?: string
  addresses?: string[]
  connector?: typeof connector
}

beforeEach(() => {
  // Node 25 exposes a server localStorage; use browser-style storage in this fixture.
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    get length() {
      return stored.size
    },
    key: (index: number) => [...stored.keys()][index] ?? null,
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  })
  current = { status: 'connected', address, addresses: [address], connector }
  connector.getAccounts.mockReset().mockResolvedValue([address])
  mocks.account.mockImplementation(() => current)
  mocks.connections.mockImplementation(() =>
    current.connector ? [{ connector: current.connector }] : []
  )
  mocks.disconnect.mockReset().mockResolvedValue(undefined)
  mocks.sign.mockResolvedValue('0x1234')
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function expiredAgw() {
  window.localStorage.setItem(
    'privy-caw:app:connection',
    JSON.stringify({ address: signer, exp: Date.now() - 1000 })
  )
}

describe('AGW and EOA connection lifecycle', () => {
  it('offers reconnection when a revoked AGW returns no accounts', async () => {
    current = {
      ...current,
      addresses: [address, signer],
      connector: { ...connector, id: 'xyz.abs.privy' },
    }
    const { result } = renderHook(useAbstractWallet)
    await waitFor(() => expect(result.current.isAvailable).toBe(true))
    connector.getAccounts.mockResolvedValue([])
    await act(async () => expect(await result.current.revalidate()).toBe(false))
    expect(result.current.isExpired).toBe(true)
    expect(mocks.disconnect).toHaveBeenCalledWith({ connector: current.connector })
  })

  it('EOA ignores an expired AGW record, including focus rechecks', async () => {
    expiredAgw()
    const { result } = renderHook(useAbstractWallet)
    expect(result.current.isAvailable).toBe(true)
    act(() => window.dispatchEvent(new Event('focus')))
    await act(async () => expect(await result.current.revalidate()).toBe(true))
    await act(async () => expect(await result.current.signMessage('prepared')).toBe('0x1234'))
    expect(mocks.disconnect).not.toHaveBeenCalled()
    expect(mocks.sign).toHaveBeenCalledWith(expect.anything(), 'prepared')
  })

  it.each(['xyz.abs.privy', 'abstract'])(
    'still expires AGW connector %s and refuses signing',
    async (id) => {
      expiredAgw()
      current = { ...current, addresses: [address, signer], connector: { ...connector, id } }
      const { result } = renderHook(useAbstractWallet)
      await waitFor(() => expect(result.current.isExpired).toBe(true))
      expect(mocks.disconnect).toHaveBeenCalledWith({ connector: current.connector })
      await act(async () => {
        await expect(result.current.signMessage('prepared')).rejects.toThrow('Reconnect')
      })
      expect(mocks.sign).not.toHaveBeenCalled()
    }
  )

  it('keeps a valid AGW connection usable', async () => {
    current = {
      ...current,
      addresses: [address, signer],
      connector: { ...connector, id: 'xyz.abs.privy' },
    }
    window.localStorage.setItem(
      'privy-caw:app:connection',
      JSON.stringify({ address: signer, exp: Date.now() + 60_000 })
    )
    const { result } = renderHook(useAbstractWallet)
    await waitFor(() => expect(result.current.isAvailable).toBe(true))
    await act(async () => expect(await result.current.revalidate()).toBe(true))
    expect(mocks.disconnect).not.toHaveBeenCalled()
  })

  it('does not carry AGW expiry over to a newly connected EOA', async () => {
    expiredAgw()
    current = {
      ...current,
      addresses: [address, signer],
      connector: { ...connector, id: 'xyz.abs.privy' },
    }
    const { result, rerender } = renderHook(useAbstractWallet)
    await waitFor(() => expect(result.current.isExpired).toBe(true))
    current = { status: 'connected', address, addresses: [address], connector }
    rerender()
    expect(result.current.isAvailable).toBe(true)
    expect(result.current.isExpired).toBe(false)
  })

  it('refuses a stale account even when still authorized by the extension', async () => {
    connector.getAccounts.mockResolvedValue([signer, address])
    const { result } = renderHook(useAbstractWallet)
    await expect(result.current.revalidate()).resolves.toBe(false)
    await expect(result.current.signMessage('prepared')).rejects.toThrow('Reconnect')
    expect(mocks.sign).not.toHaveBeenCalled()
  })

  it('opens the picker without claiming connection when it is dismissed', async () => {
    current = { status: 'disconnected' }
    const { result } = renderHook(useAbstractWallet)
    await act(async () => result.current.connectWallet())
    expect(mocks.open).toHaveBeenCalledOnce()
    expect(result.current.isAvailable).toBe(false)
    expect(result.current.isChecking).toBe(false)
  })

  it('disconnects every connector before a forced wallet selection', async () => {
    const second = { ...connector, id: 'xyz.abs.privy', uid: 'agw-1' }
    mocks.connections.mockReturnValue([{ connector }, { connector: second }])
    const { result } = renderHook(useAbstractWallet)
    await act(async () => result.current.connectWallet({ force: true }))
    expect(mocks.disconnect).toHaveBeenCalledWith({ connector })
    expect(mocks.disconnect).toHaveBeenCalledWith({ connector: second })
    expect(mocks.open).toHaveBeenCalledOnce()
  })
})
