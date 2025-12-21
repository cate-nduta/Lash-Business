import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, pesapalOrderTrackingId } = body

    if (!bookingId || !pesapalOrderTrackingId) {
      return NextResponse.json(
        { error: 'Booking ID and PesaPal order tracking ID are required' },
        { status: 400 }
      )
    }

    const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const bookings = data.bookings || []
    
    const bookingIndex = bookings.findIndex(b => b.id === bookingId)
    
    if (bookingIndex === -1) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Update booking with PesaPal tracking ID
    bookings[bookingIndex].pesapalOrderTrackingId = pesapalOrderTrackingId
    
    await writeDataFile('bookings.json', data)

    return NextResponse.json({
      success: true,
      message: 'Booking updated with PesaPal tracking ID',
    })
  } catch (error: any) {
    console.error('Error updating booking with PesaPal tracking ID:', error)
    return NextResponse.json(
      { error: 'Failed to update booking', details: error.message },
      { status: 500 }
    )
  }
}

