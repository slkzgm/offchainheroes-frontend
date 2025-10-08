'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { formatDate, formatRelative, getErrorMessage } from '@/lib/format'
import type { AlertSettingsResponse, TelegramLinkResponse } from '@/lib/api'
import {
  BellOff,
  Check,
  Copy,
  ExternalLink,
  Languages,
  Link2,
  Loader2,
  RefreshCcw,
  Send,
  X,
} from 'lucide-react'
import { useTranslate } from '@/i18n/client'
import { isLocale, localeLabels } from '@/i18n/config'

const EMPTY_LOCALE_CODES: readonly string[] = []

interface AlertSettingsCardProps {
  settings?: AlertSettingsResponse
  isLoading: boolean
  errorMessage?: string | null
  isGeneratingLink: boolean
  isUpdatingPreferences: boolean
  isUpdatingLocale: boolean
  isDisabling: boolean
  onRefresh: () => void
  onGenerateLink: () => Promise<TelegramLinkResponse>
  onDisable: () => Promise<void>
  onUpdatePreferences: (preferences: Record<string, boolean>) => Promise<AlertSettingsResponse>
  onUpdateLocale: (locale: string) => Promise<AlertSettingsResponse>
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
  isUpdatingLocale,
  isDisabling,
  onRefresh,
  onGenerateLink,
  onDisable,
  onUpdatePreferences,
  onUpdateLocale,
}: AlertSettingsCardProps) {
  const [linkDetails, setLinkDetails] = useState<TelegramLinkResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [localPreferences, setLocalPreferences] = useState<Record<string, boolean>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const t = useTranslate()
  const preferenceMetadata = useMemo(
    () => ({
      heroes_launched: {
        label: t('dashboard.alerts.preferences.heroes_launched.label'),
        description: t('dashboard.alerts.preferences.heroes_launched.description'),
      },
      heroes_returned: {
        label: t('dashboard.alerts.preferences.heroes_returned.label'),
        description: t('dashboard.alerts.preferences.heroes_returned.description'),
      },
      bait_claimed: {
        label: t('dashboard.alerts.preferences.bait_claimed.label'),
        description: t('dashboard.alerts.preferences.bait_claimed.description'),
      },
      fish_sold: {
        label: t('dashboard.alerts.preferences.fish_sold.label'),
        description: t('dashboard.alerts.preferences.fish_sold.description'),
      },
      bot_error: {
        label: t('dashboard.alerts.preferences.bot_error.label'),
        description: t('dashboard.alerts.preferences.bot_error.description'),
      },
      bot_disabled: {
        label: t('dashboard.alerts.preferences.bot_disabled.label'),
        description: t('dashboard.alerts.preferences.bot_disabled.description'),
      },
      global_announcement: {
        label: t('dashboard.alerts.preferences.global_announcement.label'),
        description: t('dashboard.alerts.preferences.global_announcement.description'),
      },
      weekly_leaderboard_reminder: {
        label: t('dashboard.alerts.preferences.weekly_leaderboard_reminder.label'),
        description: t('dashboard.alerts.preferences.weekly_leaderboard_reminder.description'),
      },
    }),
    [t],
  )

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
      .map(([key, value]) => {
        const meta = preferenceMetadata[key as keyof typeof preferenceMetadata] ?? { label: key, description: '' }
        return { key, value, meta }
      })
      .sort((a, b) => a.meta.label.localeCompare(b.meta.label))
  }, [localPreferences, preferenceMetadata])

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
    return telegram.chatId ?? t('dashboard.alerts.card.descriptionPlaceholder')
  }, [linked, settings?.telegram, t])

  const preferenceCount = preferenceEntries.length

  const availableLocaleCodes = settings?.telegram?.availableLocales ?? EMPTY_LOCALE_CODES
  const resolvedLocaleCode = useMemo(() => {
    if (!availableLocaleCodes.length) {
      return (settings?.telegram?.locale ?? 'en').split('-')[0]
    }
    const raw = (settings?.telegram?.locale ?? '').toLowerCase()
    if (!raw) {
      return availableLocaleCodes[0]
    }
    const directMatch = availableLocaleCodes.find((code) => code.toLowerCase() === raw)
    if (directMatch) {
      return directMatch
    }
    const [base] = raw.split('-')
    const baseMatch = availableLocaleCodes.find((code) => code.toLowerCase() === base)
    if (baseMatch) {
      return baseMatch
    }
    return availableLocaleCodes[0]
  }, [availableLocaleCodes, settings?.telegram?.locale])

  const localeOptions = useMemo(
    () =>
      availableLocaleCodes.map((value) => ({
        value,
        label: isLocale(value) ? localeLabels[value] : value.toUpperCase(),
      })),
    [availableLocaleCodes],
  )

  const currentLocaleLabel = useMemo(() => {
    if (!resolvedLocaleCode) {
      return t('dashboard.alerts.modal.localeFallback')
    }
    if (isLocale(resolvedLocaleCode)) {
      return localeLabels[resolvedLocaleCode]
    }
    const [base] = resolvedLocaleCode.split('-')
    if (isLocale(base)) {
      return localeLabels[base]
    }
    return resolvedLocaleCode.toUpperCase()
  }, [resolvedLocaleCode, t])

  const handleGenerateLink = async () => {
    try {
      const result = await onGenerateLink()
      setLinkDetails(result)
      setCopied(false)
      toast.success(t('dashboard.alerts.toasts.linkGenerated'))
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleDisable = async () => {
    try {
      await onDisable()
      setLinkDetails(null)
      toast.success(t('dashboard.alerts.toasts.disabled'))
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
        throw new Error(t('common.errors.clipboardUnavailable'))
      }
      setCopied(true)
      toast.success(t('dashboard.alerts.toasts.copied'))
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

  const handleLocaleSelect = async (nextLocale: string) => {
    if (!linked) return
    if (!nextLocale || nextLocale === resolvedLocaleCode) return
    try {
      await onUpdateLocale(nextLocale)
    } catch {
      // Toast handled by caller
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
                  <span className="text-sm font-semibold text-foreground">{t('dashboard.alerts.card.title')}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'border px-2 py-0.5 text-[11px] uppercase tracking-wide',
                      linked ? 'border-sky-500/60 text-sky-600' : 'border-muted-foreground/40 text-muted-foreground',
                    )}
                  >
                    {linked ? t('dashboard.alerts.card.statusLinked') : t('dashboard.alerts.card.statusNotLinked')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {linked
                    ? t('dashboard.alerts.card.descriptionLinked', {
                        destination: connectedChatLabel ?? t('dashboard.alerts.card.descriptionPlaceholder'),
                      })
                    : t('dashboard.alerts.card.descriptionUnlinked')}
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
              {t('dashboard.alerts.card.manage')}
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
              <h2 className="text-base font-semibold text-foreground">{t('dashboard.alerts.modal.title')}</h2>
              <p className="text-xs text-muted-foreground">{t('dashboard.alerts.modal.subtitle')}</p>
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
                  {linked ? t('dashboard.alerts.modal.connected') : t('dashboard.alerts.modal.notLinked')}
                </div>
                {linked ? (
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.alerts.modal.connectedDescription', {
                      destination: connectedChatLabel ?? t('dashboard.alerts.card.descriptionPlaceholder'),
                    })}
                    {linkedAtLabel ? ` · ${t('dashboard.alerts.modal.linkedAt', { time: linkedAtLabel })}` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('dashboard.alerts.modal.unlinkedDescription')}</p>
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
                    {t('dashboard.alerts.modal.disable')}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  className="bg-sky-500 text-white hover:bg-sky-500/90"
                  onClick={() => void handleGenerateLink()}
                  disabled={isGeneratingLink || isLoading}
                >
                  {isGeneratingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  {linked ? t('dashboard.alerts.modal.newLink') : t('dashboard.alerts.modal.linkTelegram')}
                </Button>
              </div>
          </div>

            {linkDetails ? (
              <div className="space-y-2 rounded-lg border border-sky-500/30 bg-background/80 p-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                    {t('dashboard.alerts.modal.startCommand')}
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
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{' '}
                    {copied ? t('dashboard.alerts.modal.copied') : t('dashboard.alerts.modal.copy')}
                  </Button>
                  {linkDetails.startUrl ? (
                    <Button size="sm" className="bg-sky-500 text-white hover:bg-sky-500/90" onClick={handleOpenTelegram}>
                      <ExternalLink className="h-4 w-4" /> {t('dashboard.alerts.modal.openTelegram')}
                    </Button>
                  ) : null}
                  {linkExpiryLabel ? (
                    <span className="text-[11px] text-muted-foreground">
                      {t('dashboard.alerts.modal.expires', { time: linkExpiryLabel })}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {localeOptions.length > 0 ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">
                    {t('dashboard.alerts.modal.localeTitle')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {linked
                      ? t('dashboard.alerts.modal.localeDescription', { language: currentLocaleLabel })
                      : t('dashboard.alerts.modal.localeDisabled')}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 border-sky-500/40 text-xs font-semibold uppercase tracking-wide text-sky-600 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-sky-300"
                      disabled={!linked || isUpdatingLocale}
                    >
                      {isUpdatingLocale ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                      <span>{currentLocaleLabel}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {localeOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        disabled={!linked || isUpdatingLocale || option.value === resolvedLocaleCode}
                        onClick={() => {
                          void handleLocaleSelect(option.value)
                        }}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>{option.label}</span>
                        {option.value === resolvedLocaleCode ? <Check className="h-4 w-4 text-sky-500" /> : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">{t('dashboard.alerts.modal.preferencesTitle')}</div>
            {preferenceCount === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
                {t('dashboard.alerts.modal.preferencesUnavailable')}
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
                        <span className="text-[11px] text-muted-foreground">
                          {value ? t('dashboard.alerts.modal.toggleOn') : t('dashboard.alerts.modal.toggleOff')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{t('dashboard.alerts.modal.syncInfo')}</p>
        </div>
      </Modal>
    </>
  )
}
