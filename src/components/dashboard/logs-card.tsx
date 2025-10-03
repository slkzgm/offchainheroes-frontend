// path: src/components/dashboard/logs-card.tsx
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { BotLogEntry } from '@/lib/api'
import { formatDate, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'

interface LogsCardProps {
  logs: BotLogEntry[]
  isLoading: boolean
  errorMessage?: string | null
  onRefresh: () => void
}

export function LogsCard({ logs, isLoading, errorMessage, onRefresh }: LogsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">System logs</CardTitle>
          <CardDescription className="text-xs">
            Technical trace of orchestration events.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" /> {errorMessage}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No logs yet.</div>
        ) : (
          <ScrollArea className="h-[22rem]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">When</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="align-top">
                    <TableCell>
                      <div className="text-xs text-muted-foreground">{formatDate(log.occurredAt)}</div>
                      <div className="text-xs">{formatRelative(log.occurredAt)}</div>
                    </TableCell>
                    <TableCell>
                      <LogSummary log={log} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

type SeverityStyle = {
  variant: BadgeProps['variant']
  className?: string
  label: string
}

const severityStyles: Record<BotLogEntry['severity'], SeverityStyle> = {
  debug: {
    variant: 'outline',
    className: 'border-dashed text-muted-foreground',
    label: 'Debug',
  },
  info: {
    variant: 'secondary',
    label: 'Info',
  },
  warning: {
    variant: 'default',
    className: 'bg-amber-500 text-amber-950 hover:bg-amber-500/90',
    label: 'Warning',
  },
  error: {
    variant: 'destructive',
    label: 'Error',
  },
}

const actionLabels: Record<BotLogEntry['action'], string> = {
  heartbeat: 'Heartbeat',
  claim_bait: 'Claim bait',
  fish_sold: 'Sell daily-deal fish',
  fish_loot: 'Fishing rewards',
  error: 'Error',
  scheduled: 'Scheduled run',
}

function formatAction(action: BotLogEntry['action']): string {
  return actionLabels[action] ?? action
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase())
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '—'
    }
    const simple = value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))
    return simple ? value.map((item) => formatValue(item)).join(', ') : JSON.stringify(value)
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return String(value)
    default:
      return JSON.stringify(value)
  }
}

function hasEntries(record: Record<string, unknown> | null | undefined): record is Record<string, unknown> {
  return !!record && Object.keys(record).length > 0
}

function LogSummary({ log }: { log: BotLogEntry }) {
  const severityStyle = severityStyles[log.severity] ?? severityStyles.info
  const actionLabel = formatAction(log.action)
  const message = (log.message ?? '').trim() || actionLabel
  const highlights = hasEntries(log.humanArgs) ? Object.entries(log.humanArgs) : []
  const hasContext = hasEntries(log.context)

  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge
          variant={severityStyle.variant}
          className={cn('uppercase tracking-wide', severityStyle.className)}
        >
          {severityStyle.label}
        </Badge>
        <Badge variant="outline" className="uppercase tracking-wide text-muted-foreground">
          {actionLabel}
        </Badge>
        <code className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
          {log.eventCode}
        </code>
      </div>

      <div className="font-medium leading-snug text-foreground">{message}</div>

      {highlights.length > 0 && (
        <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
          {highlights.map(([key, value]) => (
            <li key={key}>
              <span className="font-medium text-foreground">{formatKey(key)}:</span> {formatValue(value)}
            </li>
          ))}
        </ul>
      )}

      {hasContext && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">Raw context</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed text-foreground">
            {JSON.stringify(log.context, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
