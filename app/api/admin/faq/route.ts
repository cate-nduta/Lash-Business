import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { loadFAQ, saveFAQ } from '@/lib/faq-utils'
import type { FAQData } from '@/lib/faq-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminAuth()
    const faq = await loadFAQ()
    return NextResponse.json(faq, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading FAQ:', error)
    return NextResponse.json({ error: 'Failed to load FAQ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const faqData = body as FAQData

    const saved = await saveFAQ(faqData)
    return NextResponse.json(saved)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving FAQ:', error)
    return NextResponse.json({ error: 'Failed to save FAQ' }, { status: 500 })
  }
}

