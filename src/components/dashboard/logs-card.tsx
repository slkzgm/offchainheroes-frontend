// path: src/components/dashboard/logs-card.tsx
import { Badge } from '@/components/ui/badge'
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
          <CardTitle className="text-base font-semibold">Recent logs</CardTitle>
          <CardDescription className="text-xs">
            Latest orchestration events and status changes.
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
                  <TableHead className="w-40">Action</TableHead>
                  <TableHead>Details</TableHead>
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
                      <Badge variant="secondary" className="text-xs font-medium">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <pre className="max-h-40 overflow-auto rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
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
