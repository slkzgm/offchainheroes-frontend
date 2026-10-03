import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Config } from 'wagmi'
import type { Address } from 'viem'
import { createSiweMessage } from 'viem/siwe'
import { getAccount, getWalletClient, switchChain } from 'wagmi/actions'
import { signWalletMessage } from './wallet-signing'

vi.mock('wagmi/actions', () => ({
  getAccount: vi.fn(),
  getWalletClient: vi.fn(),
  switchChain: vi.fn(),
}))

const address = '0x1111111111111111111111111111111111111111'
const otherAddress = '0x2222222222222222222222222222222222222222'
const config = {} as Config
const signature = '0x1234'
const signMessage = vi.fn()
const connector = { uid: 'injected-1', getAccounts: vi.fn(), getChainId: vi.fn() }
let current: { status: string; address?: Address; chainId?: number; connector?: typeof connector }
function message(wallet: Address = address, chainId = 2741) {
  return createSiweMessage({
    address: wallet,
    chainId,
    domain: 'localhost',
    uri: 'http://localhost',
    version: '1',
    nonce: 'abcdefgh12345678',
  })
}

beforeEach(() => {
  current = { address, connector, status: 'connected', chainId: 2741 } as typeof current
  vi.mocked(getAccount).mockImplementation(
    () => current as unknown as ReturnType<typeof getAccount>
  )
  connector.getAccounts.mockReset().mockResolvedValue([address])
  connector.getChainId.mockReset().mockResolvedValue(2741)
  signMessage.mockReset().mockResolvedValue(signature)
  vi.mocked(getWalletClient).mockResolvedValue({ signMessage } as unknown as Awaited<
    ReturnType<typeof getWalletClient>
  >)
  vi.mocked(switchChain).mockReset()
})

describe('wallet-bound SIWE signing', () => {
  it('signs the original message with the connected account', async () => {
    const siwe = message()
    expect(await signWalletMessage(config, siwe)).toBe(signature)
    expect(signMessage).toHaveBeenCalledWith({ account: address, message: siwe })
    expect(switchChain).not.toHaveBeenCalled()
  })

  it('switches an EOA from Ethereum to Abstract before signing', async () => {
    current = { ...current, chainId: 1 }
    connector.getChainId.mockImplementation(async () => current.chainId)
    vi.mocked(switchChain).mockImplementation(async () => {
      current = { ...current, chainId: 2741 }
      return { id: 2741 } as unknown as Awaited<ReturnType<typeof switchChain>>
    })
    await signWalletMessage(config, message())
    expect(switchChain).toHaveBeenCalledWith(config, { chainId: 2741, connector })
    expect(signMessage).toHaveBeenCalledOnce()
  })

  it('never signs if network switching is refused', async () => {
    current = { ...current, chainId: 1 }
    connector.getChainId.mockResolvedValue(1)
    vi.mocked(switchChain).mockRejectedValue(new Error('User rejected request'))
    await expect(signWalletMessage(config, message())).rejects.toThrow('User rejected')
    expect(signMessage).not.toHaveBeenCalled()
  })

  it.each([message(otherAddress), message(address, 1)])(
    'rejects a message for another identity or chain',
    async (siwe) => {
      await expect(signWalletMessage(config, siwe)).rejects.toThrow('requested by')
      expect(signMessage).not.toHaveBeenCalled()
    }
  )

  it('rejects a stale account even if it remains among authorized accounts', async () => {
    connector.getAccounts.mockResolvedValue([otherAddress, address])
    await expect(signWalletMessage(config, message())).rejects.toThrow('changed')
    expect(signMessage).not.toHaveBeenCalled()
  })

  it('rejects a connector change while acquiring the wallet client', async () => {
    vi.mocked(getWalletClient).mockImplementation(async () => {
      current = { ...current, connector: { ...connector, uid: 'other' } } as typeof current
      return { signMessage } as unknown as Awaited<ReturnType<typeof getWalletClient>>
    })
    await expect(signWalletMessage(config, message())).rejects.toThrow('changed')
    expect(signMessage).not.toHaveBeenCalled()
  })

  it.each(['address', 'chain', 'connector', 'disconnect', 'provider account'])(
    'discards a signature after a %s change during the wallet prompt',
    async (change) => {
      signMessage.mockImplementation(async () => {
        if (change === 'address') current = { ...current, address: otherAddress }
        if (change === 'chain') connector.getChainId.mockResolvedValue(1)
        if (change === 'connector')
          current = { ...current, connector: { ...connector, uid: 'other' } } as typeof current
        if (change === 'disconnect') current = { status: 'disconnected' } as typeof current
        if (change === 'provider account') connector.getAccounts.mockResolvedValue([otherAddress])
        return signature
      })
      await expect(signWalletMessage(config, message())).rejects.toThrow('changed')
    }
  )

  it('propagates a rejected signature', async () => {
    signMessage.mockRejectedValue(new Error('User rejected signature'))
    await expect(signWalletMessage(config, message())).rejects.toThrow('User rejected')
  })
})
