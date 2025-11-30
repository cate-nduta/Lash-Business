import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { loadGiftCards, saveGiftCards, createGiftCard, normalizeGiftCardData } from '@/lib/gift-card-utils'
import type { GiftCardData, GiftCard } from '@/lib/gift-card-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    await requireAdminAuth()
    const giftCards = await loadGiftCards()
    return NextResponse.json(giftCards)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading gift cards:', error)
    return NextResponse.json({ error: 'Failed to load gift cards' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const { action, ...data } = body

    if (action === 'create') {
      const card = await createGiftCard({
        amount: data.amount,
        purchasedBy: data.purchasedBy,
        recipient: data.recipient,
        expirationDays: data.expirationDays,
      })
      return NextResponse.json({ success: true, card })
    }

    if (action === 'update') {
      const giftCards = await loadGiftCards()
      const updated = normalizeGiftCardData({ ...giftCards, ...data })
      const saved = await saveGiftCards(updated)
      return NextResponse.json({ success: true, giftCards: saved })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving gift cards:', error)
    return NextResponse.json({ error: 'Failed to save gift cards' }, { status: 500 })
  }
}

