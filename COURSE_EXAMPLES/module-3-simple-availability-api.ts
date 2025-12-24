/**
 * MODULE 3 EXAMPLE: Simplified Availability API
 * 
 * This is a simplified version of the availability API that follows
 * the step-by-step approach from Module 3.
 * 
 * Use this as a reference when learning Module 3.
 */

import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      // Return availability configuration
      const availability = await readDataFile('availability.json', {})
      return NextResponse.json(availability)
    }

    // Get time slots for specific date
    const availability = await readDataFile<{ businessHours?: Record<string, { enabled?: boolean; [key: string]: any }>; timeSlots?: Record<string, any[]> }>('availability.json', {})
    const bookings = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })

    // Get day of week
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

    // Get business hours for this day
    const dayHours = availability.businessHours?.[dayOfWeek]
    
    if (!dayHours?.enabled) {
      return NextResponse.json({ timeSlots: [] })
    }

    // Get time slots for this day type
    const isSaturday = dayOfWeek === 'saturday'
    const slotKey = isSaturday ? 'saturday' : 'weekday'
    const slots = availability.timeSlots?.[slotKey] || []

    // Filter out booked times
    const bookedTimes = bookings.bookings
      .filter(b => b.date === date && b.status === 'confirmed')
      .map(b => b.timeSlot || b.time)

    const availableSlots = slots.filter((slot: any) => {
      const slotTime = slot.label || `${slot.hour}:${String(slot.minute).padStart(2, '0')}`
      return !bookedTimes.includes(slotTime)
    })

    return NextResponse.json({ timeSlots: availableSlots })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}

