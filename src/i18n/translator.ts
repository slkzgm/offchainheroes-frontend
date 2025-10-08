import type { Locale } from './config'
import { defaultLocale } from './config'
import type { Messages as DictionaryMessages } from './dictionaries/en'

type NormalizeMessages<T> = T extends string
  ? string
  : T extends Array<infer U>
    ? Array<NormalizeMessages<U>>
    : T extends Record<string, unknown>
      ? { [K in keyof T]: NormalizeMessages<T[K]> }
      : T

export type Messages = NormalizeMessages<DictionaryMessages>

const dictionaries: Record<Locale, () => Promise<Messages>> = {
  en: () => import('./dictionaries/en').then((module) => module.default),
  ko: () => import('./dictionaries/ko').then((module) => module.default),
}

type Path<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : T[K] extends Record<string, unknown> ? `${K}.${Path<T[K]>}` : never
    }[keyof T & string]

export type TranslationKey = Path<Messages>

export type TranslationValues = Record<string, string | number | boolean | null | undefined>

export async function getMessages(locale: Locale): Promise<Messages> {
  const loader = dictionaries[locale]
  if (!loader) {
    return dictionaries[defaultLocale]()
  }
  return loader()
}

function resolveMessage(messages: Messages, key: TranslationKey): unknown {
  return key.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc) && segment in acc) {
      return (acc as Record<string, unknown>)[segment]
    }
    return undefined
  }, messages)
}

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function interpolate(message: string, values?: TranslationValues): string {
  if (!values) return message
  return message.replace(/{{\s*([\w.-]+)\s*}}/g, (_match, token) => {
    const replacement = values[token]
    return replacement === undefined ? '' : formatValue(replacement)
  })
}

export function createTranslator(messages: Messages) {
  return (key: TranslationKey, values?: TranslationValues): string => {
    const resolved = resolveMessage(messages, key)
    if (typeof resolved === 'string') {
      return interpolate(resolved, values)
    }
    return key
  }
}
