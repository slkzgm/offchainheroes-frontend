import type { Config } from 'wagmi'
import { getAccount, getWalletClient, switchChain } from 'wagmi/actions'
import { abstract } from 'viem/chains'
import { parseSiweMessage } from 'viem/siwe'

/** Both app login and game-session renewal must use the SIWE message's wallet on Abstract. */
export async function signWalletMessage(config: Config, message: string) {
  const initial = getAccount(config)
  const { address, connector } = initial
  const siwe = parseSiweMessage(message)
  if (
    initial.status !== 'connected' ||
    !address ||
    !connector ||
    siwe.address?.toLowerCase() !== address.toLowerCase() ||
    siwe.chainId !== abstract.id
  ) {
    throw new Error('Connect the wallet requested by the sign-in message on Abstract.')
  }

  const assertWallet = async (checkChain = true) => {
    const accounts = await connector.getAccounts()
    const chainId = checkChain ? await connector.getChainId() : undefined
    const current = getAccount(config)
    if (
      current.status !== 'connected' ||
      current.address?.toLowerCase() !== address.toLowerCase() ||
      current.connector?.uid !== connector.uid ||
      accounts[0]?.toLowerCase() !== address.toLowerCase() ||
      (checkChain && (chainId !== abstract.id || current.chainId !== abstract.id))
    ) {
      throw new Error('Wallet or network changed. Please try again.')
    }
  }

  await assertWallet(false)
  if ((await connector.getChainId()) !== abstract.id) {
    await switchChain(config, { chainId: abstract.id, connector })
  }
  await assertWallet()
  const client = await getWalletClient(config, {
    account: address,
    chainId: abstract.id,
    connector,
  })
  await assertWallet()
  const signature = await client.signMessage({ account: address, message })
  await assertWallet()
  return signature
}
