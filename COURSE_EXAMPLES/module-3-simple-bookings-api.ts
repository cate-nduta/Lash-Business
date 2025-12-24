/**
 * MODULE 3 EXAMPLE: Simplified Bookings API
 * 
 * This is a simplified version of the bookings API that follows
 * the step-by-step approach from Module 3.
 * 
 * Use this as a reference when learning Module 3.
 */

import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json()

    // Validate required fields
    const { name, email, phone, date, timeSlot, serviceId, serviceName, price } = bookingData

    if (!name || !email || !phone || !date || !timeSlot || !serviceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Load existing bookings
    const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })

    // Create new booking
    const newBooking = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      date,
      timeSlot,
      serviceId,
      serviceName,
      price,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    }

    // Add to bookings array
    data.bookings.push(newBooking)

    // Save back to file
    await writeDataFile('bookings.json', data)

    // TODO: Send email confirmation (we'll add this in Module 7)
    // TODO: Add to calendar (we'll add this in Module 3.6)

    return NextResponse.json({
      success: true,
      booking: newBooking
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch bookings (for admin later)
export async function GET() {
  try {
    const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    return NextResponse.json(data.bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

