import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { NewsletterRecord } from '@/types/newsletter'
import { sanitizeOptionalText, sanitizeText, ValidationError } from '@/lib/input-validation'
import { renderNewsletterHtml } from '@/lib/newsletter-renderer'
import {
  ensureThemeId,
  loadNewsletterStore,
  normalizeNewsletterRecord,
  sanitizeNewsletterBlocks,
  saveNewsletterStore,
} from './utils'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const store = await loadNewsletterStore()
    const newsletters = store.newsletters.map(normalizeNewsletterRecord)
    return NextResponse.json({ newsletters })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading newsletters:', error)
    return NextResponse.json({ error: 'Failed to load newsletters' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()

    let title: string
    let subject: string
    let preheader: string
    let description: string
    let themeId: string

    try {
      title = sanitizeText(body.title, { fieldName: 'Title', maxLength: 120 })
      subject = sanitizeOptionalText(body.subject, { fieldName: 'Subject', maxLength: 160, optional: true })
      preheader = sanitizeOptionalText(body.preheader, { fieldName: 'Preheader', maxLength: 140, optional: true })
      description = sanitizeOptionalText(body.description, { fieldName: 'Description', maxLength: 220, optional: true })
      themeId = ensureThemeId(body.themeId)
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    const rawBlocks = Array.isArray(body.blocks) ? body.blocks : []
    const sanitizedBlocks = sanitizeNewsletterBlocks(rawBlocks)

    if (sanitizedBlocks.length === 0) {
      return NextResponse.json({ error: 'Add at least one content block before saving.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const store = await loadNewsletterStore()
    const newRecord: NewsletterRecord = {
      id: `newsletter-${Date.now()}`,
      title,
      subject,
      preheader,
      description,
      themeId,
      blocks: sanitizedBlocks,
      contentHtml: renderNewsletterHtml(sanitizedBlocks, themeId),
      compiledAt: now,
      createdAt: now,
      updatedAt: now,
    }

    store.newsletters.push(newRecord)
    await saveNewsletterStore(store)

    return NextResponse.json({ success: true, newsletter: newRecord })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating newsletter:', error)
    return NextResponse.json({ error: 'Failed to create newsletter' }, { status: 500 })
  }
}

