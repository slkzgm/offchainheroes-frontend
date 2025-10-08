// path: src/components/dashboard/bot-controls-card.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { BotConfigurationResponse } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { Loader2, RotateCcw } from 'lucide-react'
import { useTranslate } from '@/i18n/client'

interface BotControlsCardProps {
  config?: BotConfigurationResponse
  disabled: boolean
  isUpdating: boolean
  isManualRunPending: boolean
  onToggleEnabled: (checked: boolean) => void
  onToggleAutoClaim: (checked: boolean) => void
  onToggleAutoSell: (checked: boolean) => void
  onTriggerRun: () => void
}

export function BotControlsCard({
  config,
  disabled,
  isUpdating,
  isManualRunPending,
  onToggleEnabled,
  onToggleAutoClaim,
  onToggleAutoSell,
  onTriggerRun,
}: BotControlsCardProps) {
  const t = useTranslate()

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
