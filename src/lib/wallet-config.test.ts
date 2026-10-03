import { afterEach, describe, expect, it, vi } from 'vitest'
import { connectorsForWallets, getWalletConnectConnector } from '@rainbow-me/rainbowkit'
import { ABSTRACT_CONNECTOR_ID, createWalletConfig } from './wallet-config'

vi.mock('@rainbow-me/rainbowkit', async (importOriginal) => {
  const original = await importOriginal<typeof import('@rainbow-me/rainbowkit')>()
  return {
    ...original,
    // Inspect real wallet descriptors without starting external wallet transports.
    connectorsForWallets: vi.fn(() => []),
    getWalletConnectConnector: vi.fn(() => vi.fn()),
  }
})

function configuredWallets() {
  const [groups, options] = vi.mocked(connectorsForWallets).mock.calls.at(-1)!
  return groups.flatMap((group) => group.wallets.map((wallet) => wallet(options)))
}

afterEach(() => vi.unstubAllGlobals())

describe('wallet configuration', () => {
  it.each([undefined, '', '   '])(
    'supports AGW and browser wallets without a Reown ID (%s)',
    (projectId) => {
      const config = createWalletConfig(projectId)
      expect(config.chains.map((chain) => chain.id)).toEqual([2741])
      expect(config._internal.ssr).toBe(true)
      expect(config._internal.mipd).toBeDefined()
      expect(configuredWallets().map((wallet) => wallet.id)).toEqual([
        ABSTRACT_CONNECTOR_ID,
        'rabby',
        'injected',
      ])
      expect(getWalletConnectConnector).not.toHaveBeenCalled()
    }
  )

  it('uses WalletConnect and native MetaMask deep links on mobile without the SDK', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone' })
    createWalletConfig('  test-project-mobile  ')
    const wallets = configuredWallets()
    const metamask = wallets.find((wallet) => wallet.id === 'metaMask')
    expect(wallets.some((wallet) => wallet.id === 'walletConnect')).toBe(true)
    expect(getWalletConnectConnector).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'test-project-mobile' })
    )
    // The replacement transport prevents RainbowKit from choosing its mobile SDK connector.
    expect(metamask?.createConnector).toBe(
      vi.mocked(getWalletConnectConnector).mock.results.at(-1)?.value
    )
    const uri = 'wc:example@2?relay-protocol=irn&symKey=abc'
    expect(metamask?.mobile?.getUri?.(uri)).toBe(`metamask://wc?uri=${encodeURIComponent(uri)}`)
    expect(metamask?.qrCode?.getUri?.(uri)).toBe(
      `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`
    )
  })

  it('retains the installed MetaMask connector', () => {
    vi.stubGlobal('ethereum', { isMetaMask: true })
    createWalletConfig('test-project-injected')
    const metamask = configuredWallets().find((wallet) => wallet.id === 'metaMask')
    expect(metamask?.installed).toBe(true)
    expect(getWalletConnectConnector).not.toHaveBeenCalled()
  })
})
