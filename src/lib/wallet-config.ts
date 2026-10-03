import { abstractWallet } from '@abstract-foundation/agw-react/connectors'
import {
  connectorsForWallets,
  getWalletConnectConnector,
  type Wallet,
} from '@rainbow-me/rainbowkit'
import {
  injectedWallet,
  metaMaskWallet as rainbowMetaMaskWallet,
  rabbyWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http } from 'wagmi'
import { abstract } from 'viem/chains'

export const ABSTRACT_CONNECTOR_ID = 'xyz.abs.privy'

const agwWallet = (): Wallet => ({
  ...abstractWallet(),
  // RainbowKit passes this ID back to the connector; retain AGW session detection.
  id: ABSTRACT_CONNECTOR_ID,
})

const metaMaskWallet = (options: Parameters<typeof rainbowMetaMaskWallet>[0]): Wallet => {
  const wallet = rainbowMetaMaskWallet(options)
  if (wallet.installed) return wallet

  // MetaMask SDK can fail to open on iOS. Use a native WalletConnect deep link
  // outside the injected browser, as in the game's wallet flow.
  return {
    ...wallet,
    mobile: { getUri: (uri) => `metamask://wc?uri=${encodeURIComponent(uri)}` },
    qrCode: {
      ...wallet.qrCode,
      getUri: (uri) => `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`,
    },
    createConnector: getWalletConnectConnector(options),
  }
}

export function createWalletConfig(projectId?: string) {
  const walletConnectProjectId = projectId?.trim() ?? ''
  const connectors = connectorsForWallets(
    [
      {
        groupName: 'Wallets',
        wallets: [
          agwWallet,
          rabbyWallet,
          injectedWallet,
          ...(walletConnectProjectId ? [metaMaskWallet, walletConnectWallet] : []),
        ],
      },
    ],
    { appName: 'Offchain Heroes', projectId: walletConnectProjectId }
  )

  return createConfig({
    chains: [abstract],
    connectors,
    transports: { [abstract.id]: http(undefined, { batch: true }) },
    ssr: true,
  })
}
