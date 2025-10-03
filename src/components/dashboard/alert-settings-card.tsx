'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { formatDate, formatRelative, getErrorMessage } from '@/lib/format'
import type { AlertSettingsResponse, TelegramLinkResponse } from '@/lib/api'
import {
  BellOff,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCcw,
  Send,
  X,
} from 'lucide-react'

interface AlertSettingsCardProps {
  settings?: AlertSettingsResponse
  isLoading: boolean
  errorMessage?: string | null
  isGeneratingLink: boolean
  isUpdatingPreferences: boolean
  isDisabling: boolean
  onRefresh: () => void
  onGenerateLink: () => Promise<TelegramLinkResponse>
  onDisable: () => Promise<void>
  onUpdatePreferences: (preferences: Record<string, boolean>) => Promise<AlertSettingsResponse>
}

const PREFERENCE_METADATA: Record<string, { label: string; description: string }> = {
  heroes_launched: {
    label: 'Launch events',
    description: 'When the bot sends heroes back to the fishing zones.',
  },
  heroes_returned: {
    label: 'Return events',
    description: 'When heroes come back with loot.',
  },
  bait_claimed: {
    label: 'Bait claimed',
    description: 'When daily bait allocations are harvested automatically.',
  },
  fish_sold: {
    label: 'Fish sold',
    description: 'When daily-deal fish are sold for marbles.',
  },
  bot_error: {
    label: 'Errors',
    description: 'Operational errors that require attention.',
  },
  bot_disabled: {
    label: 'Bot disabled',
    description: 'Alert when automation is turned off after repeated errors.',
  },
  global_announcement: {
    label: 'Announcements',
    description: 'Studio-wide messages or major updates.',
  },
  weekly_leaderboard_reminder: {
    label: 'Weekly leaderboard reminder',
    description: 'Friday reminder 10 minutes before the 15:59 UTC cutoff.',
  },
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xl">
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function AlertSettingsCard({
  settings,
  isLoading,
  errorMessage,
  isGeneratingLink,
  isUpdatingPreferences,
  isDisabling,
  onRefresh,
  onGenerateLink,
  onDisable,
  onUpdatePreferences,
}: AlertSettingsCardProps) {
  const [linkDetails, setLinkDetails] = useState<TelegramLinkResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [localPreferences, setLocalPreferences] = useState<Record<string, boolean>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)

  const linked = settings?.telegram?.linked ?? false

  useEffect(() => {
    if (!linked) {
      setLinkDetails(null)
    }
  }, [linked])

  useEffect(() => {
    setLocalPreferences(settings?.preferences ?? {})
  }, [settings?.preferences])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2_000)
    return () => clearTimeout(timer)
  }, [copied])

  const preferenceEntries = useMemo(() => {
    return Object.entries(localPreferences)
      .map(([key, value]) => ({ key, value, meta: PREFERENCE_METADATA[key] ?? { label: key, description: '' } }))
      .sort((a, b) => a.meta.label.localeCompare(b.meta.label))
  }, [localPreferences])

  const linkedAtLabel = useMemo(() => {
    if (!settings?.telegram?.linkedAt) return null
    const absolute = formatDate(settings.telegram.linkedAt)
    const relative = formatRelative(settings.telegram.linkedAt)
    return relative ? `${absolute} · ${relative}` : absolute
  }, [settings?.telegram?.linkedAt])

  const connectedChatLabel = useMemo(() => {
    if (!linked) return null
    const telegram = settings?.telegram
    if (!telegram) return null
    if (telegram.label) return telegram.label
    if (telegram.username) return `@${telegram.username}`
    return telegram.chatId ?? null
  }, [linked, settings?.telegram])

  const preferenceCount = preferenceEntries.length

  const handleGenerateLink = async () => {
    try {
      const result = await onGenerateLink()
      setLinkDetails(result)
      setCopied(false)
      toast.success('Telegram link generated. Send the /start command in Telegram to finish linking.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleDisable = async () => {
    try {
      await onDisable()
      setLinkDetails(null)
      toast.success('Telegram alerts disabled')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handlePreferenceChange = async (key: string, nextValue: boolean) => {
    const previous = localPreferences[key]
    setLocalPreferences((prev) => ({ ...prev, [key]: nextValue }))
    try {
      await onUpdatePreferences({ [key]: nextValue })
    } catch (error) {
      setLocalPreferences((prev) => ({ ...prev, [key]: previous }))
      toast.error(getErrorMessage(error))
    }
  }

  const handleCopy = async () => {
    if (!linkDetails) return
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(linkDetails.startParameter)
      } else {
        throw new Error('Clipboard access unavailable')
      }
      setCopied(true)
      toast.success('Start parameter copied')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleOpenTelegram = () => {
    if (!linkDetails?.startUrl) return
    if (typeof window !== 'undefined') {
      window.open(linkDetails.startUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const linkExpiryLabel = linkDetails
    ? formatRelative(linkDetails.expiresAt) || formatDate(linkDetails.expiresAt)
    : null

  return (
    <>
      <Card className="border border-sky-500/25">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full shadow-sm shadow-sky-500/30',
                  linked ? 'bg-sky-500' : 'bg-muted-foreground/40',
                )}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Telegram alerts</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'border px-2 py-0.5 text-[11px] uppercase tracking-wide',
                      linked ? 'border-sky-500/60 text-sky-600' : 'border-muted-foreground/40 text-muted-foreground',
                    )}
                  >
                    {linked ? 'Linked' : 'Not linked'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {linked
                    ? `Delivering to ${connectedChatLabel ?? 'Telegram chat'}.`
                    : 'Stay on top of runs with Telegram notifications.'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white shadow-sm hover:brightness-105"
              onClick={() => setIsModalOpen(true)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Manage
            </Button>
          </div>
          {errorMessage ? <p className="text-xs text-red-500">{errorMessage}</p> : null}
        </CardContent>
      </Card>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 p-1 text-white shadow-sm">
              <Send className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">Telegram alerts</h2>
              <p className="text-xs text-muted-foreground">Manage your link and realtime notification preferences.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  {linked ? 'Telegram connected' : 'Telegram not linked'}
                </div>
                {linked ? (
                  <p className="text-xs text-muted-foreground">
                    Sending alerts to {connectedChatLabel ?? 'telegram chat'}
                    {linkedAtLabel ? ` · Linked ${linkedAtLabel}` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Generate a secure link to authenticate your Telegram account and start receiving alerts.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {linked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-sky-500/40 text-sky-600 hover:bg-sky-500/10 dark:text-sky-300"
                    onClick={() => void handleDisable()}
                    disabled={isDisabling}
                  >
                    {isDisabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                    Disable
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  className="bg-sky-500 text-white hover:bg-sky-500/90"
                  onClick={() => void handleGenerateLink()}
                  disabled={isGeneratingLink || isLoading}
                >
                  {isGeneratingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  {linked ? 'New link' : 'Link Telegram'}
                </Button>
              </div>
            </div>

            {linkDetails ? (
              <div className="space-y-2 rounded-lg border border-sky-500/30 bg-background/80 p-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                    Start command
                  </span>
                  <code className="block rounded bg-muted/40 px-3 py-2 text-sm font-mono text-foreground">
                    /start {linkDetails.startParameter}
                  </code>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-sky-500/50 text-sky-600 hover:bg-sky-500/10 dark:text-sky-300"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
                  </Button>
                  {linkDetails.startUrl ? (
                    <Button size="sm" className="bg-sky-500 text-white hover:bg-sky-500/90" onClick={handleOpenTelegram}>
                      <ExternalLink className="h-4 w-4" /> Open Telegram
                    </Button>
                  ) : null}
                  {linkExpiryLabel ? (
                    <span className="text-[11px] text-muted-foreground">Expires {linkExpiryLabel}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Notification preferences</div>
            {preferenceCount === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
                Preferences unavailable. Link Telegram to initialise alert channels.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {preferenceEntries.map(({ key, value, meta }) => (
                  <div key={key} className="rounded-lg border border-border/40 bg-background/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 pr-2">
                        <div className="text-sm font-medium text-foreground">{meta.label}</div>
                        {meta.description ? (
                          <p className="text-xs text-muted-foreground">{meta.description}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={Boolean(value)}
                          onCheckedChange={(checked) => void handlePreferenceChange(key, checked)}
                          disabled={isUpdatingPreferences}
                          className="data-[state=checked]:bg-sky-500 data-[state=checked]:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
                        />
                        <span className="text-[11px] text-muted-foreground">{value ? 'On' : 'Off'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Alerts stay in sync across devices. Regenerate a link anytime to authenticate a new chat.
          </p>
        </div>
      </Modal>
    </>
  )
}
