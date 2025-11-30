import { NextRequest, NextResponse } from 'next/server'
import { createGiftCard, loadGiftCards } from '@/lib/gift-card-utils'
import { sendGiftCardPurchaseEmail } from '../email/utils'
import {
  sanitizeEmail,
  sanitizeText,
  sanitizeOptionalText,
  ValidationError,
} from '@/lib/input-validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, purchaserName, purchaserEmail, purchaserPhone, recipientName, recipientEmail, recipientMessage, payLater } = body

    // Validate amount
    const giftCards = await loadGiftCards()
    if (!giftCards.settings.enabled) {
      return NextResponse.json({ error: 'Gift cards are currently disabled' }, { status: 400 })
    }

    const numAmount = Number(amount)
    if (!Number.isFinite(numAmount) || numAmount < giftCards.settings.minAmount || numAmount > giftCards.settings.maxAmount) {
      return NextResponse.json(
        { error: `Amount must be between ${giftCards.settings.minAmount} and ${giftCards.settings.maxAmount} KSH` },
        { status: 400 }
      )
    }

    // Validate and sanitize inputs
    let email: string
    let name: string
    try {
      email = sanitizeEmail(purchaserEmail)
      name = sanitizeText(purchaserName)
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    const phone = purchaserPhone ? sanitizeOptionalText(purchaserPhone) : undefined
    const recName = recipientName ? sanitizeOptionalText(recipientName) : undefined
    let recEmail: string | undefined
    if (recipientEmail) {
      try {
        recEmail = sanitizeEmail(recipientEmail)
      } catch (error) {
        if (error instanceof ValidationError) {
          return NextResponse.json({ error: `Invalid recipient email: ${error.message}` }, { status: 400 })
        }
        throw error
      }
    }
    const recMessage = recipientMessage ? sanitizeOptionalText(recipientMessage) : undefined

    // Create gift card
    const card = await createGiftCard({
      amount: numAmount,
      purchasedBy: {
        name,
        email,
        phone,
      },
      recipient: recName || recEmail || recMessage
        ? {
            name: recName,
            email: recEmail,
            message: recMessage,
          }
        : undefined,
    })

    // Log gift card creation for debugging
    console.log('🎁 Gift card created:', {
      code: card.code,
      amount: card.amount,
      purchaserEmail: card.purchasedBy.email,
      recipientEmail: card.recipient?.email || 'none',
      recipientName: card.recipient?.name || 'none',
    })

    // Send email notification (don't fail if email fails)
    try {
      const emailResult = await sendGiftCardPurchaseEmail(card)
      console.log('📧 Email sending result:', emailResult)
    } catch (emailError) {
      console.error('❌ Error sending gift card purchase email:', emailError)
      // Continue even if email fails
    }

    return NextResponse.json({ success: true, card })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating gift card:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to create gift card',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}

