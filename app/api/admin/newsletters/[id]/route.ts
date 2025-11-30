import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { unlink } from 'fs/promises'
import path from 'path'
import { NewsletterRecord } from '@/types/newsletter'
import { sanitizeOptionalText, sanitizeText, ValidationError } from '@/lib/input-validation'
import {
  ensureThemeId,
  loadNewsletterStore,
  normalizeNewsletterRecord,
  sanitizeNewsletterBlocks,
  saveNewsletterStore,
} from '../utils'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminAuth()

    const store = await loadNewsletterStore()
    const newsletters = store.newsletters || []
    const index = newsletters.findIndex((n) => n.id === params.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
    }

    const newsletter = newsletters[index]

    if (newsletter.pdfUrl) {
      try {
        const filePath = path.join(process.cwd(), 'public', newsletter.pdfUrl)
        await unlink(filePath)
      } catch (error) {
        console.warn('Failed to delete PDF file:', error)
      }
    }

    newsletters.splice(index, 1)
    store.newsletters = newsletters
    await saveNewsletterStore(store)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting newsletter:', error)
    return NextResponse.json({ error: 'Failed to delete newsletter' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const sanitizedBlocks = sanitizeNewsletterBlocks(Array.isArray(body.blocks) ? body.blocks : [])
    if (sanitizedBlocks.length === 0) {
      return NextResponse.json({ error: 'Add at least one content block before saving.' }, { status: 400 })
    }

    const store = await loadNewsletterStore()
    const newsletters = store.newsletters || []
    const index = newsletters.findIndex((n) => n.id === params.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
    }

    const existing = newsletters[index]
    const updated: NewsletterRecord = normalizeNewsletterRecord({
      ...existing,
      title,
      subject,
      preheader,
      description,
      themeId,
      blocks: sanitizedBlocks,
      contentHtml: undefined,
      compiledAt: undefined,
      updatedAt: new Date().toISOString(),
    })

    newsletters[index] = updated
    store.newsletters = newsletters
    await saveNewsletterStore(store)

    return NextResponse.json({ success: true, newsletter: updated })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating newsletter:', error)
    return NextResponse.json({ error: 'Failed to update newsletter' }, { status: 500 })
  }
}

