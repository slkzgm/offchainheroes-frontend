'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useI18n } from '@/i18n/client'
import { localeLabels, locales, type Locale } from '@/i18n/config'
import { useTranslate } from '@/i18n/client'

export default function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale, buildHrefForLocale } = useI18n()
  const t = useTranslate()
  const [hash, setHash] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHash(window.location.hash)
    }
  }, [])

  const query = searchParams.size ? `?${searchParams.toString()}` : ''
  const currentPath = `${pathname}${query}${hash}`

  const options = useMemo(
    () =>
      locales.map((value) => ({
        value,
        label: localeLabels[value],
        href: buildHrefForLocale(value, currentPath),
      })),
    [buildHrefForLocale, currentPath],
  )

  const onSelect = (targetLocale: Locale, href: string) => {
    if (targetLocale === locale) return
    router.push(href)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full border-border text-muted-foreground hover:text-foreground"
        >
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t('common.actions.switchLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onSelect(option.value, option.href)}
            className="flex items-center justify-between gap-2"
          >
            <span>{option.label}</span>
            {option.value === locale ? <Check className="h-4 w-4 text-sky-500" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
