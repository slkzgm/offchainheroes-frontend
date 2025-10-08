'use client'

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
import { useMemo } from 'react'
import { useTranslate } from '@/i18n/client'

interface LogsCardProps {
  logs: BotLogEntry[]
  isLoading: boolean
  errorMessage?: string | null
  onRefresh: () => void
}

export function LogsCard({ logs, isLoading, errorMessage, onRefresh }: LogsCardProps) {
  const t = useTranslate()
  const severityStyles = useMemo<Record<BotLogEntry['severity'], SeverityStyle>>(
    () => ({
      debug: {
        variant: 'outline',
        className: 'border-dashed text-muted-foreground',
        label: t('dashboard.logs.severity.debug'),
      },
      info: {
        variant: 'secondary',
        label: t('dashboard.logs.severity.info'),
      },
      warning: {
        variant: 'default',
        className: 'bg-amber-500 text-amber-950 hover:bg-amber-500/90',
        label: t('dashboard.logs.severity.warning'),
      },
      error: {
        variant: 'destructive',
        label: t('dashboard.logs.severity.error'),
      },
    }),
    [t],
  )
  const actionLabels = useMemo<Record<BotLogEntry['action'], string>>(
    () => ({
      heartbeat: t('dashboard.logs.actions.heartbeat'),
      claim_bait: t('dashboard.logs.actions.claim_bait'),
      fish_sold: t('dashboard.logs.actions.fish_sold'),
      fish_loot: t('dashboard.logs.actions.fish_loot'),
      error: t('dashboard.logs.actions.error'),
      scheduled: t('dashboard.logs.actions.scheduled'),
    }),
    [t],
  )
  const formatAction = (action: BotLogEntry['action']) => actionLabels[action] ?? action

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">{t('dashboard.logs.title')}</CardTitle>
          <CardDescription className="text-xs">{t('dashboard.logs.description')}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {t('common.actions.refresh')}
        </Button>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" /> {errorMessage}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('dashboard.logs.empty')}</div>
        ) : (
          <ScrollArea className="h-[22rem]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">{t('dashboard.logs.headers.when')}</TableHead>
                  <TableHead>{t('dashboard.logs.headers.summary')}</TableHead>
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
                      <LogSummary
                        log={log}
                        severityStyles={severityStyles}
                        formatAction={formatAction}
                        rawContextLabel={t('dashboard.logs.rawContext')}
                      />
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

function LogSummary({
  log,
  severityStyles,
  formatAction,
  rawContextLabel,
}: {
  log: BotLogEntry
  severityStyles: Record<BotLogEntry['severity'], SeverityStyle>
  formatAction: (action: BotLogEntry['action']) => string
  rawContextLabel: string
}) {
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
          <summary className="cursor-pointer select-none">{rawContextLabel}</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed text-foreground">
            {JSON.stringify(log.context, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
