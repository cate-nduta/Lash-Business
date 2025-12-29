import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { renderNewsletterHtml } from '@/lib/newsletter-renderer'
import { ensureThemeId, sanitizeNewsletterBlocks } from '../utils'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()

    const themeId = ensureThemeId(body.themeId)
    const blocks = sanitizeNewsletterBlocks(Array.isArray(body.blocks) ? body.blocks : [])

    if (blocks.length === 0) {
      return NextResponse.json({ error: 'Add at least one block to preview.' }, { status: 400 })
    }

    const html = renderNewsletterHtml(blocks, themeId)

    return NextResponse.json({ html })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error rendering newsletter preview:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}












