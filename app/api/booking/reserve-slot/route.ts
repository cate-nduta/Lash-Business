import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Reserve a booking slot temporarily (before payment)
 * This reserves the slot but doesn't create the booking
 * Booking will be created only after payment is confirmed via webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      date,
      timeSlot,
      bookingReference,
    } = body

    if (!date || !timeSlot || !bookingReference) {
      return NextResponse.json(
        { error: 'Date, time slot, and booking reference are required' },
        { status: 400 }
      )
    }

    // Store temporary reservation
    const reservations = await readDataFile<Array<{
      bookingReference: string
      date: string
      timeSlot: string
      reservedAt: string
      expiresAt: string // 15 minutes from now
    }>>('pending-booking-reservations.json', [])

    // Remove expired reservations
    const now = new Date()
    const activeReservations = reservations.filter(r => {
      const expiresAt = new Date(r.expiresAt)
      return expiresAt > now
    })

    // Check if slot is already reserved
    const existingReservation = activeReservations.find(
      r => r.date === date && r.timeSlot === timeSlot
    )

    if (existingReservation) {
      // Check if it's the same booking reference (same user retrying)
      if (existingReservation.bookingReference !== bookingReference) {
        return NextResponse.json(
          { error: 'This time slot is temporarily reserved. Please try another slot.' },
          { status: 409 }
        )
      }
      // Same reference - extend reservation
      existingReservation.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      const index = activeReservations.findIndex(r => r.bookingReference === bookingReference)
      if (index !== -1) {
        activeReservations[index] = existingReservation
      }
    } else {
      // Create new reservation
      activeReservations.push({
        bookingReference,
        date,
        timeSlot,
        reservedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      })
    }

    await writeDataFile('pending-booking-reservations.json', activeReservations)

    return NextResponse.json({
      success: true,
      reserved: true,
      expiresAt: activeReservations.find(r => r.bookingReference === bookingReference)?.expiresAt,
    })
  } catch (error: any) {
    console.error('Error reserving slot:', error)
    return NextResponse.json(
      { error: 'Failed to reserve slot' },
      { status: 500 }
    )
  }
}

