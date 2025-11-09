import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
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
    
    if (bookingIndex !== -1) {
      bookings[bookingIndex].testimonialRequested = true
      bookings[bookingIndex].testimonialRequestedAt = new Date().toISOString()
      await writeDataFile('bookings.json', { bookings })
    }

    console.info('[send-testimonial-request] Email sending is disabled; skipping mail delivery.')

    return NextResponse.json({
      success: true,
      emailSent: false,
      message: EMAIL_DISABLED_MESSAGE,
    })
  } catch (error) {
    console.error('Error handling testimonial request:', error)
    return NextResponse.json({ error: 'Failed to send testimonial request' }, { status: 500 })
  }
}

