import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

interface Booking {
  id: string
  name: string
  email: string
  phone: string
  service: string
  date: string
  timeSlot: string
  location: string
  originalPrice: number
  discount: number
  finalPrice: number
  deposit: number
  discountType?: string
  promoCode?: string
  mpesaCheckoutRequestID?: string
  createdAt: string
  testimonialRequested?: boolean
  testimonialRequestedAt?: string
  payments?: Array<{
    amount: number
    method: 'cash' | 'mpesa'
    date: string
    mpesaCheckoutRequestID?: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    
    const body = await request.json()
    const { bookingId, amount, paymentMethod, mpesaCheckoutRequestID } = body

    if (!bookingId || !paymentMethod) {
      return NextResponse.json(
        { error: 'Booking ID and payment method are required' },
        { status: 400 }
      )
    }

    // For M-Pesa, amount can be 0 if we're just saving the checkout request ID
    // The actual amount will be updated when the callback is received
    if (paymentMethod === 'cash' && (!amount || amount <= 0)) {
      return NextResponse.json(
        { error: 'Amount is required for cash payments' },
        { status: 400 }
      )
    }

    const data = readDataFile<{ bookings: Booking[] }>('bookings.json')
    const bookings = data.bookings || []
    
    const bookingIndex = bookings.findIndex(b => b.id === bookingId)
    
    if (bookingIndex === -1) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const booking = bookings[bookingIndex]
    
    // Initialize payments array if it doesn't exist
    if (!booking.payments) {
      booking.payments = []
    }

    // For M-Pesa with checkout request ID, check if it already exists
    if (mpesaCheckoutRequestID) {
      const existingPayment = booking.payments.find(
        (p: any) => p.mpesaCheckoutRequestID === mpesaCheckoutRequestID
      )
      
      if (existingPayment) {
        // Payment already exists, just return success
        return NextResponse.json({
          success: true,
          message: 'Payment request already recorded',
          booking: booking,
        })
      }
    }

    // Add payment record
    booking.payments.push({
      amount: amount || 0, // Will be updated for M-Pesa when callback is received
      method: paymentMethod,
      date: new Date().toISOString(),
      mpesaCheckoutRequestID: mpesaCheckoutRequestID || undefined,
    })

    // Update deposit only for cash payments (M-Pesa will be updated via callback)
    if (paymentMethod === 'cash' && amount > 0) {
      booking.deposit = (booking.deposit || 0) + amount
    }

    // Save updated booking
    bookings[bookingIndex] = booking
    writeDataFile('bookings.json', { bookings })

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      booking: booking,
    })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}

