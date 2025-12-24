import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Update booking with payment tracking ID
 * POST /api/booking/update-payment-tracking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, paymentOrderTrackingId, paymentMethod } = body

    if (!bookingId || !paymentOrderTrackingId) {
      return NextResponse.json(
        { error: 'bookingId and paymentOrderTrackingId are required' },
        { status: 400 }
      )
    }

    const bookings = await readDataFile<any[]>('bookings.json', [])
    const booking = bookings.find(b => b.bookingId === bookingId)

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Update booking with payment tracking info
    booking.paymentOrderTrackingId = paymentOrderTrackingId
    if (paymentMethod) {
      booking.paymentMethod = paymentMethod
    }

    const bookingIndex = bookings.findIndex(b => b.bookingId === bookingId)
    if (bookingIndex !== -1) {
      bookings[bookingIndex] = booking
      await writeDataFile('bookings.json', bookings)
    }

    return NextResponse.json({ 
      success: true,
      booking 
    })
  } catch (error: any) {
    console.error('Error updating booking payment tracking:', error)
    return NextResponse.json(
      { error: 'Failed to update booking payment tracking' },
      { status: 500 }
    )
  }
}

