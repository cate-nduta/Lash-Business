import { NextRequest, NextResponse } from 'next/server'
import { loadLabsFAQ } from '@/lib/labs-faq-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const faq = await loadLabsFAQ()
    return NextResponse.json(faq, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error loading Labs FAQ:', error)
    return NextResponse.json({ error: 'Failed to load Labs FAQ' }, { status: 500 })
  }
}

