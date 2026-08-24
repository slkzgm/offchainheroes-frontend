const PRIVY_CONNECTION_PREFIX = 'privy-caw:'
const PRIVY_CONNECTION_SUFFIXES = [':connection', ':connection:smart-wallet'] as const

interface StorageReader {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
}

interface PrivyConnectionRecord {
  address?: unknown
  exp?: unknown
}

export type AbstractWalletConnectionSnapshot =
  | { status: 'active'; expiresAt: number }
  | { status: 'expired'; expiresAt: number }
  | { status: 'unknown' }

function isPrivyConnectionKey(key: string): boolean {
  return (
    key.startsWith(PRIVY_CONNECTION_PREFIX) &&
    PRIVY_CONNECTION_SUFFIXES.some((suffix) => key.endsWith(suffix))
  )
}

/**
 * Reads the expiry already persisted by Privy's cross-app connector.
 *
 * The connector currently checks this value only when its provider is created.
 * Keeping this parsing isolated means an upstream lifecycle fix can replace it
 * without leaking Privy's storage schema into UI components.
 */
export function readAbstractWalletConnection(
  storage: StorageReader,
  signerAddress?: string,
  now = Date.now()
): AbstractWalletConnectionSnapshot {
  try {
    const candidates: Array<{ address?: string; expiresAt: number }> = []

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key || !isPrivyConnectionKey(key)) continue

      const rawValue = storage.getItem(key)
      if (!rawValue) continue

      const parsed = JSON.parse(rawValue) as PrivyConnectionRecord
      if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) continue

      candidates.push({
        address: typeof parsed.address === 'string' ? parsed.address.toLowerCase() : undefined,
        expiresAt: parsed.exp,
      })
    }

    const normalizedSigner = signerAddress?.toLowerCase()
    const matchingCandidate = normalizedSigner
      ? candidates.find((candidate) => candidate.address === normalizedSigner)
      : candidates.length === 1
        ? candidates[0]
        : undefined

    if (!matchingCandidate) return { status: 'unknown' }

    return matchingCandidate.expiresAt <= now
      ? { status: 'expired', expiresAt: matchingCandidate.expiresAt }
      : { status: 'active', expiresAt: matchingCandidate.expiresAt }
  } catch {
    return { status: 'unknown' }
  }
}
