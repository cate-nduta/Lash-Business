import { NextRequest, NextResponse } from 'next/server'
import { initializeTransaction, type InitializeTransactionParams } from '@/lib/paystack-utils'
import { readDataFile } from '@/lib/data-utils'
import { getExchangeRates } from '@/lib/currency-server-utils'
import { convertCurrency, type Currency } from '@/lib/currency-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PendingBooking = {
  bookingReference: string
  bookingData?: {
    deposit?: number
    finalPrice?: number
  }
}

const normalizePaymentCurrency = (currency: unknown): Currency => {
  return currency === 'USD' ? 'USD' : 'KES'
}

async function getAuthoritativeBookingAmount(
  bookingReference: unknown,
  requestedCurrency: Currency,
): Promise<number | null> {
  if (!bookingReference || typeof bookingReference !== 'string') return null

  const pendingBookings = await readDataFile<PendingBooking[]>('pending-bookings.json', [])
  const pendingBooking = pendingBookings.find((booking) => booking.bookingReference === bookingReference)
  if (!pendingBooking?.bookingData) return null

  const expectedAmountKES = Number(pendingBooking.bookingData.deposit ?? pendingBooking.bookingData.finalPrice ?? 0)
  if (!Number.isFinite(expectedAmountKES) || expectedAmountKES <= 0) return null

  if (requestedCurrency === 'USD') {
    const exchangeRates = await getExchangeRates()
    return Math.max(0.01, convertCurrency(expectedAmountKES, 'KES', 'USD', exchangeRates))
  }

  return Math.max(1, Math.round(expectedAmountKES))
}

/**
 * Initialize a Paystack transaction
 * POST /api/paystack/initialize
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      amount,
      currency = 'KES',
      reference,
      callbackUrl,
      metadata = {},
      customerName,
      phone,
    } = body

    // Validation
    if (!email || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Email and amount are required' },
        { status: 400 }
      )
    }

    const paymentCurrency = normalizePaymentCurrency(currency)
    const authoritativeBookingAmount = await getAuthoritativeBookingAmount(
      metadata?.booking_reference,
      paymentCurrency,
    )

    // Convert to number if it's a string. Booking payments prefer the server-calculated pending booking amount.
    const numericAmount = authoritativeBookingAmount ?? (typeof amount === 'string' ? parseFloat(amount) : Number(amount))
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Initialize transaction
    const params: InitializeTransactionParams = {
      email: email.toLowerCase().trim(),
      amount: numericAmount, // Use the validated numeric amount
      currency: paymentCurrency,
      reference,
      callbackUrl,
      metadata,
      customerName,
      phone,
    }

    const result = await initializeTransaction(params)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to initialize transaction' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
      accessCode: result.accessCode,
      amount: numericAmount,
      currency: paymentCurrency,
    })
  } catch (error: any) {
    console.error('Error in Paystack initialize endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to initialize transaction' },
      { status: 500 }
    )
  }
}

