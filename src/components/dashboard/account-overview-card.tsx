// path: src/components/dashboard/account-overview-card.tsx
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CalendarClock, CheckCircle2, Loader2 } from 'lucide-react'
import type { BotConfigurationResponse, UserOverviewResponse, BotSessionStatus } from '@/lib/api'
import { formatDate, formatRelative } from '@/components/dashboard/dashboard-utils'

interface AccountOverviewCardProps {
  overview?: UserOverviewResponse
  sessionStatus?: BotSessionStatus
  config?: BotConfigurationResponse
  isLoading: boolean
  errorMessage?: string | null
}

export function AccountOverviewCard({
  overview,
  sessionStatus,
  config,
  isLoading,
  errorMessage,
}: AccountOverviewCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            Account overview
            {sessionStatus?.hasCookie ? (
              <Badge variant="outline" className="gap-1 text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" /> Linked
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 text-xs font-medium">
                <AlertCircle className="h-3 w-3" /> Cookie missing
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Wallet {overview?.user.address ?? '—'} · ID {overview?.user.userId ?? '—'}
          </CardDescription>
        </div>
        {sessionStatus?.renewSoon && (
          <Badge variant="secondary" className="gap-1 text-xs font-medium">
            <CalendarClock className="h-3 w-3" /> Renew session soon
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading account summary…
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 text-sm">
              <div className="text-xs uppercase text-muted-foreground">Session</div>
              <div className="rounded-lg border border-border/60 bg-background/50 p-4">
                <div>Game cookie: {sessionStatus?.hasCookie ? 'Linked' : 'Missing'}</div>
                <div>
                  Expires: {sessionStatus?.expiresAt ? formatDate(sessionStatus.expiresAt) : '—'}{' '}
                  <span className="text-xs text-muted-foreground">
                    {sessionStatus?.expiresAt ? `(${formatRelative(sessionStatus.expiresAt)})` : ''}
                  </span>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="h-3 w-3" /> Next check:{' '}
                  {config?.nextCheck?.nextCheckAt ? (
                    <span>
                      {formatDate(config.nextCheck.nextCheckAt)} · {formatRelative(config.nextCheck.nextCheckAt)}
                    </span>
                  ) : (
                    'not scheduled'
                  )}
                </div>
                {config?.nextCheck?.notes?.length ? (
                  <div className="pt-2 text-xs text-muted-foreground">
                    {config.nextCheck.notes.map((note) => (
                      <div key={note}>• {note}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="text-xs uppercase text-muted-foreground">Game profile</div>
              <div className="space-y-1 rounded-lg border border-border/60 bg-background/50 p-4">
                <div>Username: {overview?.sessionUser?.username ?? '—'}</div>
                <div>Public key: {overview?.sessionUser?.publicKey ?? '—'}</div>
                <div>Discord: {overview?.sessionUser?.discordHandle ?? overview?.sessionUser?.discordId ?? '—'}</div>
                <div>Last sign-in: {formatDate(overview?.sessionUser?.lastSignedIn)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      {errorMessage && !isLoading && (
        <CardFooter>
          <Badge variant="destructive" className="gap-1 text-xs font-medium">
            <AlertCircle className="h-3 w-3" /> {errorMessage}
          </Badge>
        </CardFooter>
      )}
    </Card>
  )
}
