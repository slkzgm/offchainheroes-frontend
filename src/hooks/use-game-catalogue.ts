import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import {
  getGameCatalogue,
  type CatalogueBaitRecord,
  type FishDefinitionRecord,
  type FishingZone,
  type GameCatalogueResponse,
} from '@/lib/api'
import type { FishDefinition } from '@/lib/live-state'

export interface CatalogueBaitDefinition {
  id: number
  name: string
  rarity: FishDefinitionRecord['rarity']
  image: string
  weaponBait: number
  helmetBait: number
  topBait: number
  legsBait: number
}

export interface GameCatalogueData {
  revision: string
  fish: readonly FishDefinition[]
  fishingZones: readonly FishingZone[]
  bait: readonly CatalogueBaitDefinition[]
}

export type CatalogueQueryResult = UseQueryResult<GameCatalogueData, Error> & { revision?: string }

export type CatalogueSliceResult<TSlice> = Omit<CatalogueQueryResult, 'data'> & { data: TSlice }

export interface UseGameCatalogueOptions {
  enabled?: boolean
}

const SIX_HOURS_MS = 1000 * 60 * 60 * 6
const ONE_DAY_MS = 1000 * 60 * 60 * 24
const FOCUS_REFETCH_INTERVAL = 1000 * 60 * 5
const CATALOGUE_REVISION_STORAGE_KEY = 'och.catalogueRevision'

function mapFishDefinition(entry: FishDefinitionRecord): FishDefinition {
  return {
    id: entry.fishId,
    slug: entry.slug,
    label: entry.name,
    rarity: entry.rarity,
    description: entry.description,
    image: entry.image,
    unitValue: entry.unitValue ?? undefined,
    zoneIds: Array.from(entry.zoneIds),
    tags: Array.from(entry.tags),
  }
}

function mapFishingZone(entry: FishingZone): FishingZone {
  if (!entry.fishingConfig) {
    return { ...entry }
  }

  const fishMaxChances: Record<number, number> = {}
  for (const [key, value] of Object.entries(entry.fishingConfig.fishMaxChances ?? {})) {
    const numericKey = Number.parseInt(key, 10)
    fishMaxChances[numericKey] = typeof value === 'number' ? value : Number(value)
  }

  const availableFish: Record<number, number[]> = {}
  for (const [bucket, ids] of Object.entries(entry.fishingConfig.availableFish ?? {})) {
    const numericBucket = Number.parseInt(bucket, 10)
    availableFish[numericBucket] = Array.isArray(ids) ? [...ids] : []
  }

  return {
    ...entry,
    fishingConfig: {
      guaranteedFishDurationSeconds: entry.fishingConfig.guaranteedFishDurationSeconds,
      fishMaxChances,
      availableFish,
    },
  }
}

function mapBaitDefinition(entry: CatalogueBaitRecord): CatalogueBaitDefinition {
  return {
    id: entry.id,
    name: entry.name,
    rarity: entry.rarity,
    image: entry.image,
    weaponBait: entry.weaponBait,
    helmetBait: entry.helmetBait,
    topBait: entry.topBait,
    legsBait: entry.legsBait,
  }
}

function normaliseCatalogue(response: GameCatalogueResponse): GameCatalogueData {
  return {
    revision: response.revision,
    fish: response.fish.map(mapFishDefinition),
    fishingZones: response.fishingZones.map(mapFishingZone),
    bait: response.bait.map(mapBaitDefinition),
  }
}

async function fetchCatalogue(): Promise<GameCatalogueData> {
  const response = await getGameCatalogue()
  return normaliseCatalogue(response)
}

export function useGameCatalogue(options: UseGameCatalogueOptions = {}): CatalogueQueryResult {
  const { enabled = true } = options
  const queryClient = useQueryClient()
  const lastFocusRefetchRef = useRef(0)

  const catalogueQuery = useQuery<GameCatalogueData, Error>({
    queryKey: ['game', 'catalogue'],
    queryFn: fetchCatalogue,
    enabled,
    staleTime: SIX_HOURS_MS,
    gcTime: ONE_DAY_MS,
  })

  const revision = catalogueQuery.data?.revision
  const isBrowser = typeof window !== 'undefined'

  useEffect(() => {
    if (!enabled || !isBrowser || !revision) return
    try {
      const stored = window.localStorage.getItem(CATALOGUE_REVISION_STORAGE_KEY)
      if (stored !== revision) {
        window.localStorage.setItem(CATALOGUE_REVISION_STORAGE_KEY, revision)
      }
    } catch {
      /* noop - localStorage peut être indisponible (private mode) */
    }
  }, [enabled, isBrowser, revision])

  useEffect(() => {
    if (!enabled || !isBrowser) return

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CATALOGUE_REVISION_STORAGE_KEY) return
      const nextRevision = event.newValue ?? ''
      if (!nextRevision || nextRevision === revision) return
      queryClient.invalidateQueries({ queryKey: ['game', 'catalogue'], exact: true }).catch(() => {})
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [enabled, isBrowser, queryClient, revision])

  useEffect(() => {
    if (!enabled || !isBrowser) return

    const maybeRefetchOnFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      const now = Date.now()
      if (now - lastFocusRefetchRef.current < FOCUS_REFETCH_INTERVAL) return
      lastFocusRefetchRef.current = now
      queryClient.invalidateQueries({ queryKey: ['game', 'catalogue'], exact: true }).catch(() => {})
    }

    window.addEventListener('focus', maybeRefetchOnFocus)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', maybeRefetchOnFocus)
    }

    return () => {
      window.removeEventListener('focus', maybeRefetchOnFocus)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', maybeRefetchOnFocus)
      }
    }
  }, [enabled, isBrowser, queryClient])

  return {
    ...catalogueQuery,
    revision,
  } as CatalogueQueryResult
}

export function useFishDefinitions(
  options: UseGameCatalogueOptions = {},
): CatalogueSliceResult<readonly FishDefinition[]> {
  const catalogueQuery = useGameCatalogue(options)

  return {
    ...catalogueQuery,
    data: catalogueQuery.data?.fish ?? [],
  }
}

export function useFishingZones(
  options: UseGameCatalogueOptions = {},
): CatalogueSliceResult<readonly FishingZone[]> {
  const catalogueQuery = useGameCatalogue(options)

  return {
    ...catalogueQuery,
    data: catalogueQuery.data?.fishingZones ?? [],
  }
}

export function useBaitDefinitions(
  options: UseGameCatalogueOptions = {},
): CatalogueSliceResult<readonly CatalogueBaitDefinition[]> {
  const catalogueQuery = useGameCatalogue(options)

  return {
    ...catalogueQuery,
    data: catalogueQuery.data?.bait ?? [],
  }
}
