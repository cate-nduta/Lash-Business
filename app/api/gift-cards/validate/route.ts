import { NextRequest, NextResponse } from 'next/server'
import { findGiftCardByCode } from '@/lib/gift-card-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Gift card code is required' }, { status: 400 })
    }

    const card = await findGiftCardByCode(code)

    if (!card) {
      return NextResponse.json({ valid: false, error: 'Gift card not found' }, { status: 404 })
    }

    if (card.status !== 'active') {
      return NextResponse.json({ valid: false, error: `Gift card is ${card.status}` }, { status: 400 })
    }

    if (new Date(card.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Gift card has expired' }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      card: {
        code: card.code,
        amount: card.amount,
        originalAmount: card.originalAmount,
        expiresAt: card.expiresAt,
        recipient: card.recipient ? {
          name: card.recipient.name,
          email: card.recipient.email,
        } : undefined,
      },
    })
  } catch (error) {
    console.error('Error validating gift card:', error)
    return NextResponse.json({ valid: false, error: 'Failed to validate gift card' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Gift card code is required' }, { status: 400 })
    }

    const card = await findGiftCardByCode(code)

    if (!card) {
      return NextResponse.json({ valid: false, error: 'Gift card not found' }, { status: 404 })
    }

    if (card.status !== 'active') {
      return NextResponse.json({ valid: false, error: `Gift card is ${card.status}` }, { status: 400 })
    }

    if (new Date(card.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Gift card has expired' }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      card: {
        code: card.code,
        amount: card.amount,
        originalAmount: card.originalAmount,
        expiresAt: card.expiresAt,
        recipient: card.recipient ? {
          name: card.recipient.name,
          email: card.recipient.email,
        } : undefined,
      },
    })
  } catch (error) {
    console.error('Error validating gift card:', error)
    return NextResponse.json({ valid: false, error: 'Failed to validate gift card' }, { status: 500 })
  }
}

