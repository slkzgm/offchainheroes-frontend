export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  address: string;
};

type TokensListener = () => void;

export const TOKEN_STORAGE_KEY = 'och_tokens';
const tokenListeners = new Set<TokensListener>();

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function notifyTokenListeners(): void {
  if (isBrowser()) {
    window.dispatchEvent(new Event('och:tokens-changed'));
  }
  tokenListeners.forEach((listener) => listener());
}

export function onTokensChanged(listener: TokensListener): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function verifySiwe(payload: {
  message: string;
  signature: string;
}): Promise<{ accessToken: string; refreshToken: string; address: string }> {
  return http('/auth/verify', { method: 'POST', body: JSON.stringify(payload) });
}

export async function prepareSiwe(payload: {
  address: string;
  chainId: number;
}): Promise<{
  message: string;
  nonce: string;
  ttl: number;
  issuedAt: string;
  domain: string;
  uri: string;
  chainId: number;
  address: string;
  statement?: string;
}> {
  return http('/auth/prepare', { method: 'POST', body: JSON.stringify(payload) });
}

export async function prepareBotSession(accessToken: string): Promise<{
  message: string;
  nonce: string;
  issuedAt: string;
  domain: string;
  uri: string;
  chainId: number;
  statement?: string;
}> {
  return http('/bot/session/prepare', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({}),
  });
}

export async function verifyBotSession(
  accessToken: string,
  payload: { message: string; signature: string },
): Promise<{ stored: boolean; cookieNames: string[] }> {
  return http('/bot/session/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export interface BotSessionStatus {
  hasCookie: boolean;
  expiresAt?: string;
  expired: boolean;
  renewSoon: boolean;
  renewAheadSeconds: number;
}

export async function getBotSessionStatus(
  accessToken: string,
): Promise<BotSessionStatus> {
  return http('/bot/session/status', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface UserOverviewResponse {
  user: { userId: string; address: string };
  bot: BotSessionStatus;
  config: {
    isEnabled: boolean;
    autoClaimBait: boolean;
    autoSellFish: boolean;
    lastSuccessAt?: string | null;
    lastErrorAt?: string | null;
    nextCheck?: {
      recordedAt?: string;
      nextCheckAt: string | null;
      notes: string[];
    } | null;
  } | null;
  sessionUser: {
    publicKey?: string;
    username?: string | null;
    discordHandle?: string | null;
    discordId?: string | null;
    twitterHandle?: string | null;
    avatarId?: number | null;
    lastSignedIn?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
}

export async function getUserOverview(accessToken: string): Promise<UserOverviewResponse> {
  return http('/user/overview', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface BotConfigurationResponse {
  userId: string;
  isEnabled: boolean;
  autoClaimBait: boolean;
  autoSellFish: boolean;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  nextCheckHint: string | null;
  nextCheckContext: {
    recordedAt?: string;
    nextCheckAt: string | null;
    notes: string[];
  } | null;
  nextCheck: {
    hint: string | null;
    recordedAt?: string;
    nextCheckAt: string | null;
    notes: string[];
    context: {
      recordedAt?: string;
      nextCheckAt: string | null;
      notes: string[];
    } | null;
  } | null;
}

export async function getBotConfig(accessToken: string): Promise<BotConfigurationResponse> {
  return http('/bot/config', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateBotConfig(
  accessToken: string,
  payload: Partial<{ isEnabled: boolean; autoClaimBait: boolean; autoSellFish: boolean }>,
): Promise<BotConfigurationResponse> {
  return http('/bot/config', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export async function triggerManualRun(accessToken: string): Promise<{ status: string }> {
  return http('/bot/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type BotLogEntry = {
  id: string;
  occurredAt: string;
  action: string;
  payload: unknown;
};

export async function getBotLogs(accessToken: string, limit = 50): Promise<BotLogEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return http(`/bot/logs?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface BotStateResponse {
  timestamp: string;
  bait?: {
    balances?: Record<string, unknown>;
    claimable?: Record<string, unknown>;
    totalGearStaked?: number;
  } | null;
  marbles?: {
    balance?: number;
    week?: number;
  } | null;
  fish?: {
    regular?: Record<string, number>;
    dailyDeals?: Record<string, number>;
    dealsSoldToday?: Record<string, number>;
  } | null;
  heroes?: {
    active: BotHeroState[];
    ready: BotHeroState[];
    idle: BotHeroState[];
  } | null;
}

export interface BotHeroState {
  id: number | string;
  energy?: number;
  energyEstimated?: number;
  maxEnergy?: number;
  energyUpdated?: string;
  status?: string;
  activeSession?: {
    id?: number | string;
    startedAt?: string;
    matureAt?: string;
    matured?: boolean;
    elapsedSeconds?: number;
    durationSeconds?: number;
    zoneId?: number;
    bait?: string | null;
  } | null;
}

export async function getBotState(accessToken: string): Promise<BotStateResponse> {
  return http('/bot/state', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function me(accessToken: string): Promise<{ address: string; userId: string }> {
  return http('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  return http('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
}

export function saveTokens(tokens: StoredTokens): void {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  notifyTokenListeners();
}

export function loadTokens(): StoredTokens | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  notifyTokenListeners();
}
