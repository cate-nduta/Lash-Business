import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { loadLabsFAQ, saveLabsFAQ, type LabsFAQData } from '@/lib/labs-faq-utils'
import { revalidatePath } from 'next/cache'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminAuth()
    const faq = await loadLabsFAQ()
    return NextResponse.json(faq, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading Labs FAQ:', error)
    return NextResponse.json({ error: 'Failed to load Labs FAQ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const faqData = body as LabsFAQData

    const saved = await saveLabsFAQ(faqData)
    
    // Revalidate the FAQ page
    revalidatePath('/labs/faq')
    revalidatePath('/api/labs/faq')

    return NextResponse.json(saved)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving Labs FAQ:', error)
    return NextResponse.json({ error: 'Failed to save Labs FAQ' }, { status: 500 })
  }
}

