'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { ExternalLink, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslate } from '@/i18n/client'

const DISCORD_INVITE_URL = 'https://discord.gg/kaKtsQG43'

type DiscordSocialLinkProps = {
  className?: string
}

export function DiscordSocialLink({ className }: DiscordSocialLinkProps) {
  const t = useTranslate()

  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className={cn('h-9 w-9 rounded-full border-border text-muted-foreground hover:text-foreground', className)}
    >
      <a href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">
        <MessageCircle className="h-4 w-4" />
        <span className="sr-only">{t('community.discord.socialLabel')}</span>
      </a>
    </Button>
  )
}

export function CommunityBanner(props: ComponentPropsWithoutRef<'section'>) {
  const t = useTranslate()

  return (
    <section
      {...props}
      className={cn('border-b border-border/70 bg-primary text-primary-foreground', props.className)}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-medium">{t('community.discord.title')}</span>{' '}
            <span className="text-primary-foreground/85">{t('community.discord.description')}</span>
          </p>
        </div>
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="w-full shrink-0 bg-background text-foreground hover:bg-background/90 sm:w-auto"
        >
          <a href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">
            {t('community.discord.cta')}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </section>
  )
}
