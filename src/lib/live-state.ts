// path: src/lib/live-state.ts
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'heroic' | 'legendary' | 'mythic'

export interface BaitDefinition {
  key: string
  label: string
  order: number
  aliases: readonly string[]
  accentClass: string
}

export interface BaitOverviewEntry {
  key: string
  label: string
  rarity: BaitDefinition
  owned: number
  claimable: number
}

export interface FishDefinition {
  id: number
  label: string
  rarity: RarityTier
  unitValue?: number
}

export interface FishInventoryRow {
  definition: FishDefinition
  quantity: number
  unitValue: number
  totalValue: number
}

export interface FishInventoryTotals {
  quantity: number
  value: number
}

export interface DailyDealRow {
  definition: FishDefinition
  sold: number
  allowance: number
  remaining: number
}

const BAIT_DEFINITIONS: readonly BaitDefinition[] = [
  {
    key: 'mythic',
    label: 'Mythic',
    order: 0,
    aliases: ['mythic', 'bait6', 'bait6balance'],
    accentClass: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400',
  },
  {
    key: 'legendary',
    label: 'Legendary',
    order: 1,
    aliases: ['legendary', 'bait5', 'bait5balance'],
    accentClass: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  {
    key: 'heroic',
    label: 'Heroic',
    order: 2,
    aliases: ['heroic', 'bait4', 'bait7', 'bait4balance', 'bait7balance'],
    accentClass: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  },
  {
    key: 'epic',
    label: 'Epic',
    order: 3,
    aliases: ['epic', 'bait3', 'bait3balance'],
    accentClass: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  },
  {
    key: 'rare',
    label: 'Rare',
    order: 4,
    aliases: ['rare', 'bait2', 'bait2balance'],
    accentClass: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  {
    key: 'uncommon',
    label: 'Uncommon',
    order: 5,
    aliases: ['uncommon', 'bait1', 'bait1balance'],
    accentClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  {
    key: 'common',
    label: 'Common',
    order: 6,
    aliases: ['common', 'bait0', 'bait0balance'],
    accentClass: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-300 dark:text-zinc-400',
  },
] as const

const BAIT_ALIAS_LOOKUP = (() => {
  const map = new Map<string, BaitDefinition>()
  for (const definition of BAIT_DEFINITIONS) {
    for (const alias of definition.aliases) {
      map.set(alias.toLowerCase(), definition)
    }
  }
  return map
})()

function normaliseBaitKey(rawKey: string): string[] {
  const lower = rawKey.toLowerCase().trim()
  const candidates = new Set<string>([lower])

  const strippedBalance = lower.replace(/[_\s-]?balance$/, '')
  candidates.add(strippedBalance)

  const strippedPrefixes = strippedBalance.replace(/^(total|owned)/, '')
  candidates.add(strippedPrefixes)

  const collapsed = strippedPrefixes.replace(/[_\s-]/g, '')
  candidates.add(collapsed)

  return Array.from(candidates).filter(Boolean)
}

function fallbackLabel(value: string): string {
  return value
    .split(/[_.\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function createFallbackDefinition(key: string): BaitDefinition {
  return {
    key,
    label: fallbackLabel(key),
    order: Number.POSITIVE_INFINITY,
    aliases: [key],
    accentClass: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-300 dark:text-zinc-400',
  }
}

export function listBaitDefinitions(): readonly BaitDefinition[] {
  return BAIT_DEFINITIONS
}

export function findBaitDefinition(rawKey: string): BaitDefinition | undefined {
  for (const candidate of normaliseBaitKey(rawKey)) {
    if (BAIT_ALIAS_LOOKUP.has(candidate)) {
      return BAIT_ALIAS_LOOKUP.get(candidate)
    }
  }
  return undefined
}

export function buildBaitOverview(
  ownedRecord: Record<string, unknown> | null | undefined,
  claimableRecord: Record<string, unknown> | null | undefined,
): { entries: BaitOverviewEntry[]; totals: { owned: number; claimable: number } } {
  const entriesMap = new Map<string, BaitOverviewEntry>()

  const getOrCreateEntry = (definition: BaitDefinition): BaitOverviewEntry => {
    const existing = entriesMap.get(definition.key)
    if (existing) return existing
    const entry: BaitOverviewEntry = {
      key: definition.key,
      label: definition.label,
      rarity: definition,
      owned: 0,
      claimable: 0,
    }
    entriesMap.set(definition.key, entry)
    return entry
  }

  const normaliseRecord = (
    record: Record<string, unknown> | null | undefined,
    target: 'owned' | 'claimable',
  ) => {
    for (const [rawKey, value] of Object.entries(record ?? {})) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      const definition = findBaitDefinition(rawKey) ?? createFallbackDefinition(rawKey)
      if (!Number.isFinite(definition.order) && value === 0) continue
      const entry = getOrCreateEntry(definition)
      entry[target] += value
    }
  }

  for (const definition of BAIT_DEFINITIONS) {
    getOrCreateEntry(definition)
  }

  normaliseRecord(ownedRecord, 'owned')
  normaliseRecord(claimableRecord, 'claimable')

  const entries = Array.from(entriesMap.values()).sort((a, b) => {
    if (a.rarity.order === b.rarity.order) return a.label.localeCompare(b.label)
    return a.rarity.order - b.rarity.order
  })

  const totals = entries.reduce(
    (acc, entry) => {
      acc.owned += entry.owned
      acc.claimable += entry.claimable
      return acc
    },
    { owned: 0, claimable: 0 },
  )

  return { entries, totals }
}

const FISH_DEFINITIONS: readonly FishDefinition[] = [
  { id: 1, label: 'Minner', rarity: 'common', unitValue: 8 },
  { id: 2, label: 'Shiny', rarity: 'common', unitValue: 8 },
  { id: 3, label: 'Milly', rarity: 'common', unitValue: 9 },
  { id: 4, label: 'Paty', rarity: 'common', unitValue: 10 },
  { id: 5, label: 'Dany', rarity: 'common', unitValue: 12 },
  { id: 6, label: 'Beam', rarity: 'uncommon', unitValue: 18 },
  { id: 7, label: 'Cheb', rarity: 'uncommon', unitValue: 20 },
  { id: 8, label: 'Xander', rarity: 'uncommon', unitValue: 22 },
  { id: 9, label: 'Spike', rarity: 'uncommon', unitValue: 24 },
  { id: 10, label: 'Boomer', rarity: 'epic', unitValue: 49 },
  { id: 11, label: 'Pudgy Fish', rarity: 'mythic', unitValue: 200 },
] as const

const FISH_LOOKUP = new Map<number, FishDefinition>(FISH_DEFINITIONS.map((entry) => [entry.id, entry]))

function createFallbackFishDefinition(id: number): FishDefinition {
  return {
    id,
    label: `Fish #${id}`,
    rarity: 'common',
  }
}

export function listFishDefinitions(): readonly FishDefinition[] {
  return FISH_DEFINITIONS
}

export function findFishDefinition(id: number): FishDefinition | undefined {
  return FISH_LOOKUP.get(id)
}

export function buildFishSnapshot(
  inventory?: Record<string, number | undefined> | null,
  dailyDeals?: Record<string, number | undefined> | null,
  soldToday?: Record<string, number | undefined> | null,
): {
  inventoryRows: FishInventoryRow[]
  inventoryTotals: FishInventoryTotals
  dailyDealRows: DailyDealRow[]
  dailyDealTotals: { sold: number; allowance: number; remaining: number }
} {
  const safeInventory = inventory ?? {}
  const safeDeals = dailyDeals ?? {}
  const safeSold = soldToday ?? {}

  const rowsMap = new Map<number, FishInventoryRow>()

  const getDefinition = (id: number): FishDefinition => findFishDefinition(id) ?? createFallbackFishDefinition(id)

  const ensureRow = (id: number): FishInventoryRow => {
    const existing = rowsMap.get(id)
    if (existing) return existing
    const definition = getDefinition(id)
    const unitValue = definition.unitValue ?? 0
    const row: FishInventoryRow = {
      definition,
      quantity: 0,
      unitValue,
      totalValue: 0,
    }
    rowsMap.set(id, row)
    return row
  }

  const applyQuantity = (source: Record<string, number | undefined>) => {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      const id = Number.parseInt(key, 10)
      if (!Number.isFinite(id)) continue
      const row = ensureRow(id)
      row.quantity = Math.max(0, value)
      row.totalValue = row.quantity * row.unitValue
    }
  }

  for (const definition of FISH_DEFINITIONS) {
    ensureRow(definition.id)
  }

  applyQuantity(safeInventory)

  const inventoryRows = Array.from(rowsMap.values()).sort((a, b) => a.definition.id - b.definition.id)
  const inventoryTotals = inventoryRows.reduce(
    (acc, row) => {
      acc.quantity += row.quantity
      acc.value += row.totalValue
      return acc
    },
    { quantity: 0, value: 0 },
  )

  const dailyDealMap = new Map<number, DailyDealRow>()

  const ensureDealRow = (id: number): DailyDealRow => {
    const existing = dailyDealMap.get(id)
    if (existing) return existing
    const definition = getDefinition(id)
    const row: DailyDealRow = {
      definition,
      sold: 0,
      allowance: 0,
      remaining: 0,
    }
    dailyDealMap.set(id, row)
    return row
  }

  const applyDeal = (
    source: Record<string, number | undefined>,
    property: 'allowance' | 'sold',
  ) => {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      const id = Number.parseInt(key, 10)
      if (!Number.isFinite(id)) continue
      const row = ensureDealRow(id)
      row[property] = Math.max(0, value)
    }
  }

  applyDeal(safeDeals, 'allowance')
  applyDeal(safeSold, 'sold')

  const dailyDealRows = Array.from(dailyDealMap.values())
    .map((row) => {
      const allowance = row.allowance > 0 ? row.allowance : row.sold
      const remaining = Math.max(0, allowance - row.sold)
      return {
        ...row,
        allowance,
        remaining,
      }
    })
    .filter((row) => row.allowance > 0 || row.sold > 0)
    .sort((a, b) => a.definition.id - b.definition.id)

  const dailyDealTotals = dailyDealRows.reduce(
    (acc, row) => {
      acc.sold += row.sold
      acc.allowance += row.allowance
      acc.remaining += row.remaining
      return acc
    },
    { sold: 0, allowance: 0, remaining: 0 },
  )

  return {
    inventoryRows,
    inventoryTotals,
    dailyDealRows,
    dailyDealTotals,
  }
}

export function rarityAccent(rarity: RarityTier): string {
  switch (rarity) {
    case 'mythic':
      return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400'
    case 'legendary':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400'
    case 'heroic':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-400'
    case 'epic':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-400'
    case 'rare':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-400'
    case 'uncommon':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    default:
      return 'border-zinc-400/30 bg-zinc-400/10 text-zinc-300 dark:text-zinc-400'
  }
}
