import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { sendEmailNotification } from '../email/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Send booking confirmation email by booking reference or payment reference
 * This is called from the payment success page
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      )
    }

    // Find booking by payment reference
    const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const booking = bookingsData.bookings.find(
      b => 
        b.paymentOrderTrackingId === reference ||
        b.paymentTransactionId === reference ||
        b.bookingReference === reference
    )

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found for this payment reference' },
        { status: 404 }
      )
    }

    // Check if payment is confirmed
    if (booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'not_required') {
      return NextResponse.json(
        { error: 'Payment not confirmed. Please ensure payment was successful.' },
        { status: 400 }
      )
    }

    // Send confirmation email
    try {
      const emailResult = await sendEmailNotification({
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        service: booking.service || '',
        date: booking.date,
        timeSlot: booking.timeSlot,
        location: booking.location || process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya',
        originalPrice: booking.originalPrice || 0,
        discount: booking.discount || 0,
        finalPrice: booking.finalPrice || 0,
        deposit: booking.deposit || 0,
        bookingId: booking.bookingId,
        manageToken: booking.manageToken,
        policyWindowHours: booking.cancellationWindowHours || 72,
        notes: booking.notes,
        appointmentPreference: booking.appointmentPreference,
        desiredLook: booking.desiredLook || 'Custom',
        desiredLookStatus: booking.desiredLookStatus || 'custom',
        isGiftCardBooking: !!booking.giftCardCode,
      })

      if (!emailResult || !emailResult.success) {
        return NextResponse.json(
          { 
            error: 'Failed to send email confirmation',
            details: emailResult?.error || 'Email service unavailable'
          },
          { status: 500 }
        )
      }

      console.log('✅ Booking confirmation email sent:', {
        bookingId: booking.bookingId,
        email: booking.email,
        ownerEmailSent: emailResult.ownerEmailSent,
        customerEmailSent: emailResult.customerEmailSent,
      })

      return NextResponse.json({
        success: true,
        message: 'Booking confirmation email sent successfully',
        bookingId: booking.bookingId,
        emailSent: emailResult.customerEmailSent,
      })
    } catch (emailError: any) {
      console.error('Error sending booking confirmation email:', emailError)
      return NextResponse.json(
        { 
          error: 'Failed to send email confirmation',
          details: emailError.message || 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in send-confirmation endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    )
  }
}

