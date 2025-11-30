import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { renderNewsletterHtml } from '@/lib/newsletter-renderer'
import {
  NewsletterBlock,
  NewsletterRecord,
  NewsletterTheme,
  NEWSLETTER_THEMES,
} from '@/types/newsletter'

export const DATA_FILE = 'newsletters.json'

export type NewsletterStore = {
  newsletters: NewsletterRecord[]
}

const DEFAULT_STORE: NewsletterStore = { newsletters: [] }

const safeNumber = (value: unknown) => (typeof value === 'number' ? value : undefined)

const cleanText = (value: unknown, max = 400) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

const ensureId = (maybeId: unknown, prefix: string) =>
  typeof maybeId === 'string' && maybeId.trim().length > 0
    ? maybeId.trim()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const sanitizeButton = (button: any) => {
  if (!button || typeof button !== 'object') return undefined
  const label = cleanText(button.label, 80)
  const url = cleanText(button.url, 300)
  if (!label || !url) return undefined
  return {
    label,
    url,
    style: button.style === 'outline' || button.style === 'link' ? button.style : 'solid',
    alignment: button.alignment === 'right' || button.alignment === 'left' ? button.alignment : 'center',
  }
}

export const sanitizeNewsletterBlocks = (rawBlocks: any[]): NewsletterBlock[] =>
  rawBlocks
    .map((block, index) => sanitizeBlock(block, index))
    .filter((block): block is NewsletterBlock => Boolean(block))

const sanitizeBlock = (block: any, index: number): NewsletterBlock | null => {
  if (!block || typeof block !== 'object') return null
  const type = block.type
  const base = {
    id: ensureId(block.id, `block-${index}`),
    type,
    backgroundColor: cleanText(block.backgroundColor, 20) || undefined,
    paddingTop: safeNumber(block.paddingTop),
    paddingBottom: safeNumber(block.paddingBottom),
  }

  switch (type) {
    case 'hero': {
      const heading = cleanText(block.heading, 160) || 'Untitled Section'
      return {
        ...base,
        type: 'hero',
        eyebrow: cleanText(block.eyebrow, 80) || undefined,
        heading,
        subheading: cleanText(block.subheading, 240) || undefined,
        imageUrl: cleanText(block.imageUrl, 400) || undefined,
        alignment: block.alignment === 'left' || block.alignment === 'right' ? block.alignment : 'center',
        button: sanitizeButton(block.button),
      }
    }
    case 'text': {
      const body = cleanText(block.body, 1200)
      if (!body) return null
      return {
        ...base,
        type: 'text',
        heading: cleanText(block.heading, 160) || undefined,
        body,
        alignment: block.alignment === 'center' || block.alignment === 'right' ? block.alignment : 'left',
      }
    }
    case 'image': {
      const imageUrl = cleanText(block.imageUrl, 400)
      if (!imageUrl) return null
      return {
        ...base,
        type: 'image',
        imageUrl,
        caption: cleanText(block.caption, 160) || undefined,
        fullWidth: block.fullWidth !== false,
        borderRadius: typeof block.borderRadius === 'number' ? block.borderRadius : 18,
      }
    }
    case 'button': {
      const button = sanitizeButton(block.button)
      if (!button) return null
      return {
        ...base,
        type: 'button',
        button,
      }
    }
    case 'divider': {
      return {
        ...base,
        type: 'divider',
        thickness: typeof block.thickness === 'number' ? block.thickness : 1,
        color: cleanText(block.color, 20) || undefined,
        width: cleanText(block.width, 12) || '72px',
        style: block.style === 'dashed' ? 'dashed' : 'solid',
      }
    }
    case 'spacer': {
      const height = typeof block.height === 'number' ? block.height : 32
      return { ...base, type: 'spacer', height }
    }
    case 'highlight': {
      const heading = cleanText(block.heading, 160)
      if (!heading) return null
      return {
        ...base,
        type: 'highlight',
        eyebrow: cleanText(block.eyebrow, 80) || undefined,
        heading,
        body: cleanText(block.body, 400) || undefined,
        badge: cleanText(block.badge, 60) || undefined,
        imageUrl: cleanText(block.imageUrl, 400) || undefined,
        button: sanitizeButton(block.button),
      }
    }
    default:
      return null
  }
}

export const ensureThemeId = (themeId: unknown): string =>
  typeof themeId === 'string' && NEWSLETTER_THEMES.some((theme) => theme.id === themeId)
    ? themeId
    : NEWSLETTER_THEMES[0].id

export async function loadNewsletterStore(): Promise<NewsletterStore> {
  const data = await readDataFile<NewsletterStore>(DATA_FILE, DEFAULT_STORE)
  return {
    newsletters: Array.isArray(data.newsletters) ? data.newsletters : [],
  }
}

export async function saveNewsletterStore(store: NewsletterStore) {
  await writeDataFile(DATA_FILE, store)
}

export const normalizeNewsletterRecord = (record: NewsletterRecord): NewsletterRecord => {
  if (!record.blocks || record.blocks.length === 0) {
    return record
  }

  if (!record.contentHtml) {
    return {
      ...record,
      contentHtml: renderNewsletterHtml(record.blocks, record.themeId),
      compiledAt: new Date().toISOString(),
    }
  }

  return record
}

export const recompileNewsletter = (record: NewsletterRecord): NewsletterRecord => {
  if (!record.blocks || record.blocks.length === 0) return record
  return {
    ...record,
    contentHtml: renderNewsletterHtml(record.blocks, record.themeId),
    compiledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const getThemeById = (themeId: string): NewsletterTheme =>
  NEWSLETTER_THEMES.find((theme) => theme.id === themeId) || NEWSLETTER_THEMES[0]


