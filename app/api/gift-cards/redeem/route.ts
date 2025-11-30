import { NextRequest, NextResponse } from 'next/server'
import { redeemGiftCard } from '@/lib/gift-card-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, amount, bookingId, redeemedBy } = body

    if (!code || !amount || !bookingId || !redeemedBy) {
      return NextResponse.json(
        { error: 'Code, amount, bookingId, and redeemedBy are required' },
        { status: 400 }
      )
    }

    const result = await redeemGiftCard(code, Number(amount), bookingId, redeemedBy)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      remainingBalance: result.remainingBalance,
    })
  } catch (error) {
    console.error('Error redeeming gift card:', error)
    return NextResponse.json({ error: 'Failed to redeem gift card' }, { status: 500 })
  }
}

