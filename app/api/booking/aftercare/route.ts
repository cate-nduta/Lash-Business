import { NextRequest, NextResponse } from 'next/server'
import { sendAftercareEmail } from '../email/utils'
import { readDataFile } from '@/lib/data-utils'
import {
  sanitizeEmail,
  sanitizeText,
  ValidationError,
} from '@/lib/input-validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    // Load booking data
    const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const booking = data.bookings.find((b) => b.id === bookingId)

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (!booking.email) {
      return NextResponse.json(
        { error: 'Booking email not found' },
        { status: 400 }
      )
    }

    // Validate and sanitize email
    let email: string
    try {
      email = sanitizeEmail(booking.email)
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    const name = sanitizeText(booking.name || '')
    const service = sanitizeText(booking.service || 'Lash service')
    const date = booking.date || booking.timeSlot?.split('T')[0] || ''
    const timeSlot = booking.timeSlot || ''
    const location = booking.location

    // Send aftercare email
    const result = await sendAftercareEmail({
      name,
      email,
      service,
      date,
      timeSlot,
      location,
    })

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Aftercare email sent successfully' })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send aftercare email' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error sending aftercare email:', error)
    return NextResponse.json(
      { error: 'Failed to send aftercare email' },
      { status: 500 }
    )
  }
}

