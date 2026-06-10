import { NextRequest, NextResponse } from 'next/server'
import { verifyTransaction } from '@/lib/paystack-utils'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { createGiftCard } from '@/lib/gift-card-utils'
import { sendGiftCardPurchaseEmail } from '@/app/api/gift-cards/email/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function finalizeShopOrderPayment(transaction: any) {
  const metadata = transaction.metadata || {}
  const orderId = metadata.order_id
  if (!orderId) return

  const shopData = await readDataFile<{ products?: any[]; orders?: any[]; updatedAt?: string | null }>(
    'shop-products.json',
    { products: [], orders: [], updatedAt: null }
  )
  const orders = Array.isArray(shopData.orders) ? shopData.orders : []
  const products = Array.isArray(shopData.products) ? shopData.products : []
  const order = orders.find((item) => item.id === orderId)
  if (!order || order.paymentStatus === 'paid') return

  const now = transaction.paidAt || new Date().toISOString()
  order.paymentStatus = 'paid'
  order.paymentMethod = 'paystack'
  order.paymentOrderTrackingId = transaction.reference
  order.paymentTransactionId = transaction.reference
  order.paidAt = now
  order.status = order.status === 'pending_payment' ? 'pending' : order.status || 'pending'

  if (Array.isArray(order.items)) {
    order.items.forEach((item: any) => {
      const product = products.find((candidate) => candidate.id === item.productId)
      if (product && typeof product.quantity === 'number') {
        product.quantity = Math.max(product.quantity - Number(item.quantity || 0), 0)
        product.updatedAt = now
      }
    })
  }

  await writeDataFile('shop-products.json', { ...shopData, products, orders, updatedAt: now })
}

async function finalizeGiftCardPayment(transaction: any) {
  const metadata = transaction.metadata || {}
  const giftCards = await readDataFile<{ cards?: any[] }>('gift-cards.json', { cards: [] })
  const existingCard = (giftCards.cards || []).find(
    (card) => card.paymentReference === transaction.reference || card.transactionId === transaction.reference
  )
  if (existingCard) return

  const amount = Number(metadata.gift_card_amount || transaction.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) return

  const purchaserEmail = transaction.customer?.email || metadata.purchaser_email || ''
  const purchaserName =
    metadata.purchaser_name ||
    [transaction.customer?.first_name, transaction.customer?.last_name].filter(Boolean).join(' ') ||
    (purchaserEmail ? purchaserEmail.split('@')[0] : 'Gift Card Purchaser')

  const card = await createGiftCard({
    amount,
    purchasedBy: {
      name: purchaserName,
      email: purchaserEmail,
    },
    recipient: {
      name: metadata.recipient_name || undefined,
      email: metadata.recipient_email || undefined,
      message: metadata.message || undefined,
    },
  })

  const latestGiftCards = await readDataFile<{ cards?: any[] }>('gift-cards.json', { cards: [] })
  const savedCard = (latestGiftCards.cards || []).find((item) => item.id === card.id)
  if (savedCard) {
    savedCard.paymentReference = transaction.reference
    savedCard.transactionId = transaction.reference
    savedCard.paymentStatus = 'paid'
    await writeDataFile('gift-cards.json', { ...latestGiftCards, cards: latestGiftCards.cards || [] })
  }

  try {
    await sendGiftCardPurchaseEmail(card)
  } catch (error) {
    console.error('Error sending gift card purchase email from verify route:', error)
  }
}

async function finalizeBookingPayment(transaction: any, origin: string) {
  const bookingReference = transaction.metadata?.booking_reference
  if (!bookingReference || !transaction.reference) return

  try {
    const response = await fetch(`${origin}/api/booking/create-from-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingReference,
        paymentReference: transaction.reference,
      }),
    })

    if (!response.ok && response.status !== 404) {
      const details = await response.text().catch(() => '')
      console.warn('Booking payment verified but booking finalization returned an issue:', {
        bookingReference,
        status: response.status,
        details,
      })
    }
  } catch (error) {
    console.warn('Booking payment verified but immediate booking finalization failed:', error)
  }
}

async function finalizeKnownPayment(transaction: any, origin: string) {
  const status = String(transaction?.status || '').toLowerCase()
  if (!['success', 'successful', 'paid'].includes(status)) return
  const paymentType = transaction.metadata?.payment_type
  if (paymentType === 'shop_order') {
    await finalizeShopOrderPayment(transaction)
  } else if (paymentType === 'gift_card') {
    await finalizeGiftCardPayment(transaction)
  } else if (paymentType === 'booking') {
    await finalizeBookingPayment(transaction, origin)
  } else if (paymentType === 'training_enrollment') {
    const { handleTrainingEnrollmentPayment } = await import(
      '@/lib/training-payment-handler'
    )
    await handleTrainingEnrollmentPayment(transaction.reference, transaction.metadata || {}, {
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
    })
  }
}

/**
 * Verify a Paystack transaction
 * GET /api/paystack/verify?reference=xxx
 * POST /api/paystack/verify (with body containing reference, orderId, paymentType)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference, orderId, paymentType } = body

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference is required' },
        { status: 400 }
      )
    }

    // Verify transaction
    const result = await verifyTransaction(reference)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Transaction verification failed' },
        { status: 400 }
      )
    }

    await finalizeKnownPayment(result.transaction, request.nextUrl.origin)

    // For Labs tier payments, the webhook will handle the rest
    // Just return success here
    return NextResponse.json({
      success: true,
      transaction: result.transaction,
    })
  } catch (error: any) {
    console.error('Error in Paystack verify endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to verify transaction' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference is required' },
        { status: 400 }
      )
    }

    // Verify transaction
    const result = await verifyTransaction(reference)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Transaction verification failed' },
        { status: 400 }
      )
    }

    await finalizeKnownPayment(result.transaction, request.nextUrl.origin)

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
    })
  } catch (error: any) {
    console.error('Error in Paystack verify endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to verify transaction' },
      { status: 500 }
    )
  }
}

