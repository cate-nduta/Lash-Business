import { NextResponse } from 'next/server'
import { loadFAQ } from '@/lib/faq-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const faq = await loadFAQ()
    return NextResponse.json(faq)
  } catch (error) {
    console.error('Error loading FAQ:', error)
    return NextResponse.json({ error: 'Failed to load FAQ' }, { status: 500 })
  }
}

