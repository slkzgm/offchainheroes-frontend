import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LandingAuthPanel from './landing-auth-panel'
import { BotSessionCard } from './dashboard/bot-session-card'

const mocks = vi.hoisted(() => ({
  wallet: {
    address: '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa',
    isAvailable: true,
    isConnected: true,
    isChecking: false,
    isConnecting: false,
    isExpired: false,
    signMessage: vi.fn<(message: string) => Promise<`0x${string}`>>(),
    revalidate: vi.fn<() => Promise<boolean>>(),
    connectWallet: vi.fn(),
    disconnectWallet: vi.fn(),
  },
  prepareSiwe: vi.fn(),
  verifySiwe: vi.fn(),
  prepareBotSession: vi.fn(),
  verifyBotSession: vi.fn(),
  logout: vi.fn(),
  refetchSession: vi.fn(),
  replace: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/hooks/use-abstract-wallet', () => ({ useAbstractWallet: () => mocks.wallet }))
vi.mock('@/hooks/use-session', () => ({
  useSession: () => ({
    session: undefined,
    isAuthenticated: false,
    isLoading: false,
    refetch: mocks.refetchSession,
  }),
}))
vi.mock('@/lib/api', () => ({
  prepareSiwe: mocks.prepareSiwe,
  verifySiwe: mocks.verifySiwe,
  prepareBotSession: mocks.prepareBotSession,
  verifyBotSession: mocks.verifyBotSession,
  logout: mocks.logout,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }))
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }))
vi.mock('@/i18n/client', () => {
  const t = (key: string) => key
  const buildHref = (path: string) => path
  return { useI18n: () => ({ t, buildHref }), useTranslate: () => t }
})

beforeEach(() => {
  vi.resetAllMocks()
  Object.assign(mocks.wallet, {
    address: '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa',
    isAvailable: true,
    isConnected: true,
    isChecking: false,
    isConnecting: false,
    isExpired: false,
  })
  mocks.wallet.revalidate.mockResolvedValue(true)
  mocks.wallet.signMessage.mockResolvedValue('0x1234')
  mocks.prepareSiwe.mockResolvedValue({ message: 'server-prepared app SIWE message' })
  mocks.prepareBotSession.mockResolvedValue({ message: 'server-prepared game SIWE message' })
})

afterEach(cleanup)

describe('LandingAuthPanel wallet authentication', () => {
  it('prepares Abstract SIWE for the connected EOA and waits for its signature before verifying', async () => {
    let resolveSignature!: (signature: `0x${string}`) => void
    mocks.wallet.signMessage.mockReturnValue(
      new Promise((resolve) => {
        resolveSignature = resolve
      })
    )
    render(<LandingAuthPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'common.actions.login' }))
    await waitFor(() =>
      expect(mocks.wallet.signMessage).toHaveBeenCalledWith('server-prepared app SIWE message')
    )
    expect(mocks.prepareSiwe).toHaveBeenCalledWith({ address: mocks.wallet.address, chainId: 2741 })
    expect(mocks.verifySiwe).not.toHaveBeenCalled()
    expect(mocks.refetchSession).not.toHaveBeenCalled()

    await act(async () => resolveSignature('0xfeed'))
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('common.feedback.loginSuccess'))
    expect(mocks.verifySiwe).toHaveBeenCalledWith({
      message: 'server-prepared app SIWE message',
      signature: '0xfeed',
    })
    expect(mocks.refetchSession).toHaveBeenCalledTimes(1)
  })

  it('does not verify or refetch the session when the wallet rejects signing', async () => {
    mocks.wallet.signMessage.mockRejectedValue(new Error('User rejected signature'))
    render(<LandingAuthPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'common.actions.login' }))

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('User rejected signature'))
    expect(mocks.verifySiwe).not.toHaveBeenCalled()
    expect(mocks.refetchSession).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it('stops before preparing SIWE when the connected account fails revalidation', async () => {
    mocks.wallet.revalidate.mockResolvedValue(false)
    render(<LandingAuthPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'common.actions.login' }))

    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith('common.errors.connectWalletFirst')
    )
    expect(mocks.prepareSiwe).not.toHaveBeenCalled()
    expect(mocks.wallet.signMessage).not.toHaveBeenCalled()
    expect(mocks.verifySiwe).not.toHaveBeenCalled()
  })

  it('opens the wallet picker without claiming connection success', async () => {
    mocks.wallet.isAvailable = false
    mocks.wallet.isConnected = false
    render(<LandingAuthPanel />)

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'common.actions.connectWallet' }))
    )
    expect(mocks.wallet.connectWallet).toHaveBeenCalledTimes(1)
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.prepareSiwe).not.toHaveBeenCalled()
    expect(
      (screen.getByRole('button', { name: 'common.actions.login' }) as HTMLButtonElement).disabled
    ).toBe(true)
  })
})

describe('BotSessionCard wallet authentication', () => {
  it.each([false, true])(
    'signs the prepared game message for hasCookie=%s and updates only after verification',
    async (hasCookie) => {
      let resolveSignature!: (signature: `0x${string}`) => void
      mocks.wallet.signMessage.mockReturnValue(
        new Promise((resolve) => {
          resolveSignature = resolve
        })
      )
      const onSessionUpdated = vi.fn()
      render(
        <BotSessionCard
          isLoading={false}
          expectedWalletAddress={mocks.wallet.address.toLowerCase()}
          status={{ hasCookie, expired: false, renewSoon: false, renewAheadSeconds: 3600 }}
          onSessionUpdated={onSessionUpdated}
        />
      )

      fireEvent.click(
        screen.getByRole('button', {
          name: hasCookie ? 'dashboard.session.actions.renew' : 'dashboard.session.actions.link',
        })
      )
      await waitFor(() =>
        expect(mocks.wallet.signMessage).toHaveBeenCalledWith('server-prepared game SIWE message')
      )
      expect(mocks.prepareBotSession).toHaveBeenCalledTimes(1)
      expect(mocks.verifyBotSession).not.toHaveBeenCalled()
      expect(onSessionUpdated).not.toHaveBeenCalled()

      await act(async () => resolveSignature('0xbeef'))
      await waitFor(() => expect(onSessionUpdated).toHaveBeenCalledTimes(1))
      expect(mocks.verifyBotSession).toHaveBeenCalledWith({
        message: 'server-prepared game SIWE message',
        signature: '0xbeef',
      })
      expect(mocks.success).toHaveBeenCalledWith(
        hasCookie ? 'dashboard.session.success.renewed' : 'dashboard.session.success.linked'
      )
    }
  )

  it('does not verify or report a linked session after signature rejection', async () => {
    mocks.wallet.signMessage.mockRejectedValue(new Error('Signature declined'))
    const onSessionUpdated = vi.fn()
    render(<BotSessionCard isLoading={false} onSessionUpdated={onSessionUpdated} />)
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.session.actions.link' }))

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Signature declined'))
    expect(mocks.verifyBotSession).not.toHaveBeenCalled()
    expect(onSessionUpdated).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it('offers a forced reconnect for another connected wallet without preparing or verifying a game session', async () => {
    render(
      <BotSessionCard
        isLoading={false}
        expectedWalletAddress="0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      />
    )
    expect(screen.getByText('dashboard.session.hints.wrongWallet')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'dashboard.session.actions.link' })).toBeNull()

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'common.actions.connectWallet' }))
    )
    expect(mocks.wallet.connectWallet).toHaveBeenCalledWith({ force: true })
    expect(mocks.prepareBotSession).not.toHaveBeenCalled()
    expect(mocks.verifyBotSession).not.toHaveBeenCalled()
    expect(mocks.wallet.signMessage).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
  })
})
