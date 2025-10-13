// path: src/lib/api.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'

interface HttpConfig {
  retryAuth?: boolean
  expectJson?: boolean
}

async function attemptRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

async function fetchWithAuth(path: string, init: RequestInit = {}, retryAuth = true): Promise<Response> {
  const { headers, body, ...rest } = init
  const mergedHeaders = new Headers(headers ?? {})
  if (body && !(body instanceof FormData) && !mergedHeaders.has('content-type')) {
    mergedHeaders.set('content-type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...rest,
    headers: mergedHeaders,
    body,
  })

  if (response.status === 401 && retryAuth) {
    const refreshed = await attemptRefresh()
    if (refreshed) {
      return fetchWithAuth(path, init, false)
    }
  }

  return response
}

async function http<T>(path: string, init: RequestInit = {}, config: HttpConfig = {}): Promise<T> {
  const { retryAuth = true, expectJson = true } = config
  const res = await fetchWithAuth(path, init, retryAuth)

  if (!res.ok) {
    if (res.status === 204 || !expectJson) {
      return undefined as T
    }
    const text = await res.text()
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }

  if (!expectJson || res.status === 204) {
    return undefined as T
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as T
  }

  return undefined as T
}

export async function prepareSiwe(payload: {
  address: string
  chainId: number
}): Promise<{
  message: string
  nonce: string
  ttl: number
  issuedAt: string
  domain: string
  uri: string
  chainId: number
  address: string
  statement?: string
}> {
  return http('/auth/prepare', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function verifySiwe(payload: { message: string; signature: string }): Promise<{ address: string }> {
  return http('/auth/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function logout(): Promise<{ revoked: boolean }> {
  return http('/auth/logout', {
    method: 'POST',
  })
}

export interface BotSessionStatus {
  hasCookie: boolean
  expiresAt?: string
  expired: boolean
  renewSoon: boolean
  renewAheadSeconds: number
}

export interface UserOverviewResponse {
  user: { userId: string; address: string }
  bot: BotSessionStatus
  config: {
    isEnabled: boolean
    autoClaimBait: boolean
    autoSellFish: boolean
    lastSuccessAt?: string | null
    lastErrorAt?: string | null
    nextCheck?: {
      recordedAt?: string
      nextCheckAt: string | null
      notes: string[]
    } | null
  } | null
  sessionUser: {
    publicKey?: string
    username?: string | null
    discordHandle?: string | null
    discordId?: string | null
    twitterHandle?: string | null
    avatarId?: number | null
    lastSignedIn?: string | null
    createdAt?: string | null
    updatedAt?: string | null
  } | null
}

export async function getUserOverview(): Promise<UserOverviewResponse> {
  return http('/user/overview', {
    method: 'GET',
  })
}

export interface BotConfigurationResponse {
  userId: string
  isEnabled: boolean
  autoClaimBait: boolean
  autoSellFish: boolean
  zoneId: number | null
  effectiveZone: {
    id: number
    name: string
    energy: number
    enabled: boolean
  }
  lastSuccessAt: string | null
  lastErrorAt: string | null
  nextCheckHint: string | null
  nextCheckContext: {
    recordedAt?: string
    nextCheckAt: string | null
    notes: string[]
  } | null
  nextCheck: {
    hint: string | null
    recordedAt?: string
    nextCheckAt: string | null
    notes: string[]
    context: {
      recordedAt?: string
      nextCheckAt: string | null
      notes: string[]
    } | null
  } | null
}

export async function getBotConfig(): Promise<BotConfigurationResponse> {
  return http('/bot/config', {
    method: 'GET',
  })
}

export async function updateBotConfig(
  payload: Partial<{ isEnabled: boolean; autoClaimBait: boolean; autoSellFish: boolean; zoneId: number }>,
): Promise<BotConfigurationResponse> {
  return http('/bot/config', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface FishingZone {
  zoneId: number
  name: string
  energy: number
  levelRequirement: number
  deathRisk: number
  minFishingTime: number
  maxFishingTime: number
  image: string
  lockedImage: string
  enabled: boolean
  fishingConfig?: {
    guaranteedFishDurationSeconds: number
    fishMaxChances: Record<number, number>
    availableFish: Record<number, number[]>
  }
}

export type FishRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'heroic' | 'legendary' | 'mythic'

export interface FishDefinitionRecord {
  fishId: number
  slug: string
  name: string
  description: string
  rarity: FishRarity
  image: string
  unitValue: number | null
  zoneIds: readonly number[]
  tags: readonly string[]
}

export interface CatalogueBaitRecord {
  id: number
  name: string
  rarity: FishRarity
  image: string
  weaponBait: number
  helmetBait: number
  topBait: number
  legsBait: number
}

export interface GameCatalogueResponse {
  revision: string
  fish: readonly FishDefinitionRecord[]
  fishingZones: readonly FishingZone[]
  bait: readonly CatalogueBaitRecord[]
}

export async function listFishingZones(): Promise<FishingZone[]> {
  return http('/bot/zones', {
    method: 'GET',
  })
}

export async function getFishDefinitions(): Promise<FishDefinitionRecord[]> {
  return http('/game/fish/definitions', {
    method: 'GET',
  })
}

export async function getGameCatalogue(): Promise<GameCatalogueResponse> {
  return http('/game/catalogue', {
    method: 'GET',
  })
}

export async function triggerManualRun(): Promise<{ status: string }> {
  return http('/bot/run', {
    method: 'POST',
  })
}

export type BotLogAction =
  | 'heartbeat'
  | 'claim_bait'
  | 'fish_sold'
  | 'fish_loot'
  | 'error'
  | 'scheduled'

export type BotLogSeverity = 'debug' | 'info' | 'warning' | 'error'

export type BotLogEntry = {
  id: string
  occurredAt: string
  action: BotLogAction
  eventCode: string
  severity: BotLogSeverity
  message: string | null
  humanArgs: Record<string, unknown>
  context: Record<string, unknown> | null
}

type RawBotLogEntry = {
  id: string
  occurredAt: string
  action: BotLogAction
  eventCode: string
  severity: BotLogSeverity
  message?: unknown
  humanArgs?: unknown
  context?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeLogEntry(entry: RawBotLogEntry): BotLogEntry {
  const humanArgs = isRecord(entry.humanArgs) ? entry.humanArgs : {}
  const context = isRecord(entry.context) ? entry.context : null
  const message = typeof entry.message === 'string' ? entry.message : null

  return {
    id: entry.id,
    occurredAt: entry.occurredAt,
    action: entry.action,
    eventCode: entry.eventCode,
    severity: entry.severity,
    message,
    humanArgs,
    context,
  }
}

export async function getBotLogs(limit = 50): Promise<BotLogEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  const logs = await http<RawBotLogEntry[]>(`/bot/logs?${params.toString()}`, {
    method: 'GET',
  })
  return logs.map(sanitizeLogEntry)
}

export type BotActivityType =
  | 'heroes_launched'
  | 'heroes_returned'
  | 'bait_claimed'
  | 'fish_sold'
  | 'bot_error'
  | 'bot_disabled'
  | 'global_announcement'

export type BotActivityEntry = {
  id: string
  occurredAt: string
  type: BotActivityType
  title: string
  description: string | null
  data: Record<string, unknown>
  runLogId: string | null
}

type RawBotActivityEntry = {
  id: string
  occurredAt: string
  type: BotActivityType
  title: unknown
  description?: unknown
  data?: unknown
  runLogId?: unknown
}

function sanitizeActivityEntry(entry: RawBotActivityEntry): BotActivityEntry {
  return {
    id: entry.id,
    occurredAt: entry.occurredAt,
    type: entry.type,
    title: typeof entry.title === 'string' ? entry.title : String(entry.title ?? ''),
    description: typeof entry.description === 'string' ? entry.description : null,
    data: isRecord(entry.data) ? entry.data : {},
    runLogId: typeof entry.runLogId === 'string' ? entry.runLogId : null,
  }
}

export async function getBotActivity(limit = 25): Promise<BotActivityEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  const activity = await http<RawBotActivityEntry[]>(`/bot/activity?${params.toString()}`, {
    method: 'GET',
  })
  return activity.map(sanitizeActivityEntry)
}

export interface BotStateResponse {
  timestamp: string
  bait?: {
    balances?: Record<string, unknown>
    claimable?: Record<string, unknown>
    totalGearStaked?: number
    generation?: {
      perRarity?: Record<string, number>
      perAssetType?: Record<string, number>
      total?: number
    } | null
  } | null
  marbles?: {
    balance?: number
    week?: number
  } | null
  fish?: {
    regular?: Record<string, number>
    dailyDeals?: Record<string, number>
    dealsSoldToday?: Record<string, number>
  } | null
  heroes?: {
    active: BotHeroState[]
    ready: BotHeroState[]
    idle: BotHeroState[]
  } | null
}

export interface BotHeroState {
  id: number | string
  energy?: number
  energyEstimated?: number
  maxEnergy?: number
  energyUpdated?: string
  status?: string
  activeSession?: {
    id?: number | string
    startedAt?: string
    matureAt?: string
    matured?: boolean
    elapsedSeconds?: number
    durationSeconds?: number
    zoneId?: number
    bait?: string | null
  } | null
}

export async function getBotState(): Promise<BotStateResponse> {
  return http('/bot/state', {
    method: 'GET',
  })
}

export async function prepareBotSession(): Promise<{
  message: string
  nonce: string
  issuedAt: string
  domain: string
  uri: string
  chainId: number
  statement?: string
}> {
  return http('/bot/session/prepare', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function verifyBotSession(payload: {
  message: string
  signature: string
}): Promise<{ stored: boolean; cookieNames: string[] }> {
  return http('/bot/session/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getBotSessionStatus(): Promise<BotSessionStatus> {
  return http('/bot/session/status', {
    method: 'GET',
  })
}

export interface SessionInfo {
  address: string
  userId: string
}

export async function getSession(): Promise<SessionInfo | null> {
  const res = await fetchWithAuth('/auth/me', { method: 'GET' })
  if (res.status === 401) {
    return null
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }
  return (await res.json()) as SessionInfo
}

export interface AlertSettingsResponse {
  telegram: {
    linked: boolean
    chatId?: string
    label?: string | null
    username?: string | null
    linkedAt?: string
    locale: string
    availableLocales: readonly string[]
  }
  preferences: Record<string, boolean>
}

export interface TelegramLinkResponse {
  startParameter: string
  startUrl?: string
  expiresAt: string
}

export async function getAlertSettings(): Promise<AlertSettingsResponse> {
  return http('/bot/alerts/settings', {
    method: 'GET',
  })
}

export async function createTelegramLink(): Promise<TelegramLinkResponse> {
  return http('/bot/alerts/telegram/link', {
    method: 'POST',
  })
}

export async function disableTelegramAlerts(): Promise<AlertSettingsResponse> {
  return http('/bot/alerts/telegram', {
    method: 'DELETE',
  })
}

export async function updateAlertPreferences(preferences: Record<string, boolean>): Promise<AlertSettingsResponse> {
  return http('/bot/alerts/preferences', {
    method: 'POST',
    body: JSON.stringify({ preferences }),
  })
}

export async function updateAlertLocale(locale: string): Promise<AlertSettingsResponse> {
  return http('/bot/alerts/telegram/locale', {
    method: 'POST',
    body: JSON.stringify({ locale }),
  })
}
