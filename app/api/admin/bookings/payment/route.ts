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
    method: 'cash' | 'mpesa' | 'card'
    date: string
    mpesaCheckoutRequestID?: string
  }>
  status: 'confirmed' | 'cancelled' | 'completed' | 'paid'
  calendarEventId?: string | null
  cancelledAt?: string | null
  cancelledBy?: 'admin' | 'client' | null
  cancellationReason?: string | null
  refundStatus?: 'not_required' | 'not_applicable' | 'pending' | 'refunded' | 'retained'
  refundAmount?: number | null
  refundNotes?: string | null
  rescheduledAt?: string | null
  rescheduledBy?: 'admin' | 'client' | null
  rescheduleHistory?: Array<{
    fromDate: string
    fromTimeSlot: string
    toDate: string
    toTimeSlot: string
    rescheduledAt: string
    rescheduledBy: 'admin' | 'client'
    notes?: string | null
  }>
  paidInFullAt?: string | null
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const { bookingId, amount, paymentMethod, mpesaCheckoutRequestID } = body

    if (!bookingId || !paymentMethod) {
      return NextResponse.json(
        { error: 'Booking ID and payment method are required' },
        { status: 400 }
      )
    }

    if ((paymentMethod === 'cash' || paymentMethod === 'card') && (!amount || amount <= 0)) {
      return NextResponse.json(
        { error: 'Amount is required for cash and card payments' },
        { status: 400 }
      )
    }

    const data = await readDataFile<{ bookings: Booking[] }>('bookings.json', { bookings: [] })
    const bookings = data.bookings || []

    const bookingIndex = bookings.findIndex(b => b.id === bookingId)

    if (bookingIndex === -1) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const booking = bookings[bookingIndex]

    if (!booking.payments) {
      booking.payments = []
    }

    if (mpesaCheckoutRequestID) {
      const existingPayment = booking.payments.find(
        (p: any) => p.mpesaCheckoutRequestID === mpesaCheckoutRequestID
      )

      if (existingPayment) {
        return NextResponse.json({
          success: true,
          message: 'Payment request already recorded',
          booking: booking,
        })
      }
    }

    booking.payments.push({
      amount: amount || 0,
      method: paymentMethod,
      date: new Date().toISOString(),
      mpesaCheckoutRequestID: mpesaCheckoutRequestID || undefined,
    })

    if ((paymentMethod === 'cash' || paymentMethod === 'card') && amount > 0) {
      booking.deposit = (booking.deposit || 0) + amount
    }

    const totalPaid = booking.deposit || 0
    if (totalPaid >= booking.finalPrice) {
      if (!booking.paidInFullAt) {
        booking.paidInFullAt = new Date().toISOString()
      }
      if (booking.status === 'confirmed' || booking.status === 'paid') {
        booking.status = 'paid'
      }
    }

    bookings[bookingIndex] = booking
    await writeDataFile('bookings.json', { bookings })

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

