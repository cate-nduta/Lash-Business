import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'
import { initializeTransaction } from '@/lib/paystack-utils'

interface Booking {
  id: string
  name: string
  email: string
  phone: string
  service: string
  finalPrice: number
  deposit: number
  currency?: string
  isWalkIn?: boolean
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const { bookingId, amount: customAmount } = body

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    const data = await readDataFile<{ bookings: Booking[] }>('bookings.json', { bookings: [] })
    const bookings = data.bookings || []

    const booking = bookings.find(b => b.id === bookingId)

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Determine currency
    const currency = booking.currency || 'KES'
    
    // Use custom amount if provided, otherwise calculate balance
    let amount: number
    if (customAmount !== undefined && customAmount !== null) {
      // Validate custom amount
      const parsedAmount = typeof customAmount === 'string' ? parseFloat(customAmount) : customAmount
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: 'Invalid payment amount. Amount must be greater than 0.' },
          { status: 400 }
        )
      }
      amount = parsedAmount
    } else {
      // Calculate balance (default behavior)
      const balance = booking.isWalkIn 
        ? (booking.finalPrice || 0) 
        : (booking.finalPrice || 0) - (booking.deposit || 0)

      if (balance <= 0) {
        return NextResponse.json(
          { error: 'No balance due for this booking' },
          { status: 400 }
        )
      }
      amount = balance
    }

    // Initialize Paystack transaction
    const paymentResult = await initializeTransaction({
      email: booking.email.toLowerCase().trim(),
      amount: amount,
      currency: currency === 'USD' ? 'USD' : 'KES',
      metadata: {
        payment_type: 'booking_balance',
        booking_id: booking.id,
        booking_service: booking.service,
        is_balance_payment: true,
        is_walk_in: booking.isWalkIn || false,
      },
      customerName: booking.name,
      phone: booking.phone,
    })

    if (!paymentResult.success || !paymentResult.authorizationUrl) {
      console.error('Paystack initialization failed:', paymentResult.error)
      return NextResponse.json(
        { 
          error: paymentResult.error || 'Failed to initialize payment. Please try again.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: paymentResult.authorizationUrl,
      reference: paymentResult.reference,
      amount: amount,
      currency: currency,
      message: 'Payment link generated successfully',
    })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error generating balance payment link:', error)
    return NextResponse.json(
      { error: 'Failed to generate payment link' },
      { status: 500 }
    )
  }
}

