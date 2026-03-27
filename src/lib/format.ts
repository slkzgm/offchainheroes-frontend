// path: src/lib/format.ts
export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function formatRelative(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes === 0) return 'now'
  if (diffMinutes > 0) return `in ${diffMinutes} min`
  return `${Math.abs(diffMinutes)} min ago`
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '—'
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const parts: string[] = []
  if (hours) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  return parts.join(' ')
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

export function truncateAddress(value?: string | null, size = 4): string {
  if (!value) return '—'
  const normalized = value.trim()
  if (normalized.length <= size * 2) return normalized
  return `${normalized.slice(0, size + 2)}…${normalized.slice(-size)}`
}
