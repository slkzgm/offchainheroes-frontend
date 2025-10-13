// path: src/components/dashboard/bot-controls-card.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { BotConfigurationResponse, FishingZone } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { Loader2, RotateCcw } from 'lucide-react'
import { useTranslate } from '@/i18n/client'

interface BotControlsCardProps {
  config?: BotConfigurationResponse
  zones: FishingZone[]
  disabled: boolean
  isUpdating: boolean
  isManualRunPending: boolean
  onToggleEnabled: (checked: boolean) => void
  onToggleAutoClaim: (checked: boolean) => void
  onToggleAutoSell: (checked: boolean) => void
  onSelectZone: (zoneId: number) => void
  isZoneLoading: boolean
  onTriggerRun: () => void
}

export function BotControlsCard({
  config,
  zones,
  disabled,
  isUpdating,
  isManualRunPending,
  onToggleEnabled,
  onToggleAutoClaim,
  onToggleAutoSell,
  onSelectZone,
  isZoneLoading,
  onTriggerRun,
}: BotControlsCardProps) {
  const t = useTranslate()
  const selectedZoneId = config?.zoneId ?? config?.effectiveZone.id ?? null
  const effectiveZone = config?.effectiveZone
  const zoneDisabled = !!effectiveZone && !effectiveZone.enabled
  const hasSelectedZoneOption =
    selectedZoneId !== null && zones.some((zone) => zone.zoneId === selectedZoneId)

  const getZoneLabel = (zone: FishingZone): string => {
    const baseLabel = t('dashboard.controls.zone.option', { name: zone.name, energy: zone.energy })
    return zone.enabled ? baseLabel : `${baseLabel} ${t('dashboard.controls.zone.disabledTag')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t('dashboard.controls.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="bot-enabled" className="text-sm font-medium">
              {t('dashboard.controls.automation.label')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('dashboard.controls.automation.description')}</p>
          </div>
          <Switch
            id="bot-enabled"
            checked={config?.isEnabled ?? false}
            onCheckedChange={onToggleEnabled}
            disabled={disabled || isUpdating}
          />
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="bot-zone" className="text-sm font-medium">
                  {t('dashboard.controls.zone.label')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.controls.zone.description')}
                </p>
              </div>
              <select
                id="bot-zone"
                className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                value={selectedZoneId ?? ''}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isFinite(value)) {
                    onSelectZone(value)
                  }
                }}
                disabled={disabled || isUpdating || isZoneLoading || zones.length === 0}
              >
                <option value="" disabled>
                  {t('dashboard.controls.zone.placeholder')}
                </option>
                {zones.map((zone) => (
                  <option key={zone.zoneId} value={zone.zoneId} disabled={!zone.enabled}>
                    {getZoneLabel(zone)}
                  </option>
                ))}
                {!hasSelectedZoneOption && selectedZoneId !== null && effectiveZone ? (
                  <option value={selectedZoneId}>
                    {t('dashboard.controls.zone.option', {
                      name: effectiveZone.name,
                      energy: effectiveZone.energy,
                    })}
                  </option>
                ) : null}
              </select>
            </div>
            {effectiveZone ? (
              <p className="text-xs text-muted-foreground">
                {t('dashboard.controls.zone.active', {
                  name: effectiveZone.name,
                  energy: effectiveZone.energy,
                })}
                {zoneDisabled ? (
                  <span className="ml-1 text-destructive">
                    {t('dashboard.controls.zone.disabledNotice')}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="bot-auto-claim" className="text-sm font-medium">
                {t('dashboard.controls.autoClaim.label')}
              </Label>
              <p className="text-xs text-muted-foreground">{t('dashboard.controls.autoClaim.description')}</p>
            </div>
            <Switch
              id="bot-auto-claim"
              checked={config?.autoClaimBait ?? false}
              onCheckedChange={onToggleAutoClaim}
              disabled={disabled || isUpdating}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="bot-auto-sell" className="text-sm font-medium">
                {t('dashboard.controls.autoSell.label')}
              </Label>
              <p className="text-xs text-muted-foreground">{t('dashboard.controls.autoSell.description')}</p>
            </div>
            <Switch
              id="bot-auto-sell"
              checked={config?.autoSellFish ?? false}
              onCheckedChange={onToggleAutoSell}
              disabled={disabled || isUpdating}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>
            {t('dashboard.controls.lastSuccess')}: {formatDate(config?.lastSuccessAt)}
          </div>
          <div>
            {t('dashboard.controls.lastError')}: {formatDate(config?.lastErrorAt)}
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={!(config?.isEnabled ?? false) || isManualRunPending}
          onClick={onTriggerRun}
          className="gap-2"
        >
          {isManualRunPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {t('dashboard.controls.triggerRun')}
        </Button>
      </CardFooter>
    </Card>
  )
}
