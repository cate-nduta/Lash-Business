import { NextResponse } from 'next/server'
import { loadGiftCards } from '@/lib/gift-card-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const giftCards = await loadGiftCards()
    // Only return settings and enabled status for public API
    return NextResponse.json({
      enabled: giftCards.settings.enabled,
      settings: giftCards.settings,
    })
  } catch (error) {
    console.error('Error loading gift cards:', error)
    return NextResponse.json({ error: 'Failed to load gift cards' }, { status: 500 })
  }
}

