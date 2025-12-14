import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'
import { sendAftercareEmail } from '@/app/api/booking/email/utils'
import { sendPaymentReceipt } from '@/lib/receipt-email-utils'

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
    const wasPaidInFull = (booking.deposit || 0) >= booking.finalPrice
    const isNowPaidInFull = totalPaid >= booking.finalPrice
    
    if (isNowPaidInFull) {
      if (!booking.paidInFullAt) {
        booking.paidInFullAt = new Date().toISOString()
      }
      if (booking.status === 'confirmed' || booking.status === 'paid') {
        booking.status = 'paid'
      }
    }

    bookings[bookingIndex] = booking
    await writeDataFile('bookings.json', { bookings })

    // Send payment receipt
    if (booking.email && amount > 0) {
      try {
        const paymentAmount = amount || 0
        await sendPaymentReceipt({
          recipientEmail: booking.email,
          recipientName: booking.name,
          amount: paymentAmount,
          currency: 'KES',
          paymentMethod: paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Card' : 'M-Pesa',
          transactionId: mpesaCheckoutRequestID || `${booking.id}-${Date.now()}`,
          transactionDate: new Date().toISOString(),
          bookingId: booking.id,
          serviceName: booking.service || undefined,
          mpesaReceiptNumber: mpesaCheckoutRequestID || undefined,
          description: booking.service ? `Payment for ${booking.service}` : 'Booking payment',
        })
        console.log(`✅ Payment receipt sent for booking ${booking.id}`)
      } catch (receiptError) {
        console.error('Error sending payment receipt:', receiptError)
        // Don't fail the payment if receipt email fails
      }
    }

    // Send aftercare email when booking is marked as paid (appointment completed)
    if (isNowPaidInFull && !wasPaidInFull && booking.email) {
      try {
        // Check if aftercare email was already sent
        const aftercareEmailSent = (booking as any).aftercareEmailSent
        if (!aftercareEmailSent) {
          // Send aftercare email
          const date = booking.date || booking.timeSlot?.split('T')[0] || ''
          await sendAftercareEmail({
            name: booking.name,
            email: booking.email,
            service: booking.service,
            date,
            timeSlot: booking.timeSlot || '',
            location: booking.location,
          })
          
          // Mark as sent to avoid duplicates
          ;(booking as any).aftercareEmailSent = true
          bookings[bookingIndex] = booking
          await writeDataFile('bookings.json', { bookings })
        }
      } catch (error) {
        console.error('Error sending aftercare email:', error)
        // Don't fail the payment if email fails
      }
    }

    // Record revenue when payment is marked as paid (cash or card)
    if ((paymentMethod === 'cash' || paymentMethod === 'card') && amount > 0) {
      try {
        const revenueData = await readDataFile<{ 
          revenue: Array<{
            id: string
            bookingId: string
            amount: number
            paymentMethod: 'cash' | 'card' | 'mpesa'
            date: string
            createdAt: string
          }>
        }>('revenue.json', { revenue: [] })

        revenueData.revenue.push({
          id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          bookingId: bookingId,
          amount: amount,
          paymentMethod: paymentMethod,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        })

        await writeDataFile('revenue.json', revenueData)
      } catch (error) {
        console.error('Error recording revenue:', error)
        // Don't fail the payment if revenue recording fails
      }
    }

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

