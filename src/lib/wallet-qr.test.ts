import { createRequire } from 'node:module'
import { expect, it } from 'vitest'

it("renders a WalletConnect QR using RainbowKit's installed encoder", async () => {
  const require = createRequire(import.meta.url)
  const { create } = await import(
    require.resolve('cuer/QrCode', {
      paths: [require.resolve('@rainbow-me/rainbowkit')],
    })
  )
  // Cuer requests border: 0, which qr >= 0.6 rejects during modal rendering.
  const qr = create('wc:test@2?relay-protocol=irn&symKey=0123456789abcdef')
  expect(qr.grid.length).toBeGreaterThan(0)
  expect(qr.grid.every((row: boolean[]) => row.length === qr.grid.length)).toBe(true)
})
