import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendTestimonialRequestEmail } from '@/lib/email/send-testimonial-request'

const EMAIL_DISABLED_MESSAGE = 'Email service is currently disabled. No email was sent.'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const body = await request.json()
    const { bookingId, email, name } = body

    if (!bookingId || !email || !name) {
      return NextResponse.json(
        { error: 'Booking ID, email, and name are required' },
        { status: 400 }
      )
    }

    // Update booking to mark testimonial as requested
    const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const bookings = bookingsData.bookings || []
    const bookingIndex = bookings.findIndex(b => b.id === bookingId)
    const booking = bookingIndex !== -1 ? bookings[bookingIndex] : null
    
    if (bookingIndex !== -1) {
      bookings[bookingIndex].testimonialRequested = true
      bookings[bookingIndex].testimonialRequestedAt = new Date().toISOString()
      await writeDataFile('bookings.json', { bookings })
    }

    if (!booking) {
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: 'Booking updated, but record was not found for email delivery.',
      })
    }

    const emailResult = await sendTestimonialRequestEmail({
      to: email,
      name,
      bookingId,
      service: booking.service,
      appointmentDate: booking.date,
      appointmentTime: booking.timeSlot,
    })

    if (!emailResult.success) {
      const errorMessage = emailResult.error || EMAIL_DISABLED_MESSAGE
      console.warn('[send-testimonial-request] Email not sent:', errorMessage)
      return NextResponse.json({
        success: true,
        emailSent: false,
        provider: emailResult.provider,
        message: errorMessage,
      })
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      provider: emailResult.provider,
      message: 'Testimonial request email sent successfully.',
    })
  } catch (error) {
    console.error('Error handling testimonial request:', error)
    return NextResponse.json({ error: 'Failed to send testimonial request' }, { status: 500 })
  }
}

