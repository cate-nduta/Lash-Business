import { NextRequest, NextResponse } from 'next/server'
import { loadLabsFAQ } from '@/lib/labs-faq-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const faq = await loadLabsFAQ()
    return NextResponse.json(faq, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Error loading Labs FAQ:', error)
    return NextResponse.json({ error: 'Failed to load Labs FAQ' }, { status: 500 })
  }
}

