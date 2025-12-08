export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { getCalendarClientWithWrite } from '@/lib/google-calendar-client'
import { recordActivity } from '@/lib/activity-log'
import { updateFullyBookedState } from '@/lib/availability-utils'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

// getCalendarClientWithWrite is now imported from lib/google-calendar-client

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const body = await request.json()
    const { bookingId, reason, cancelledBy = 'admin' } = body as {
      bookingId: string
      reason?: string
      cancelledBy?: 'admin' | 'client'
    }

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const bookings = data.bookings || []

    const bookingIndex = bookings.findIndex((b) => b.id === bookingId)

    if (bookingIndex === -1) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const booking = bookings[bookingIndex]

    if (booking.status === 'cancelled') {
      return NextResponse.json({
        success: true,
        booking,
        warning: 'Booking was already cancelled',
      })
    }

    const now = new Date()
    const appointmentTime = booking.timeSlot ? new Date(booking.timeSlot) : null
    const hoursUntilAppointment = appointmentTime
      ? (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      : null

    const isLateCancellation = typeof hoursUntilAppointment === 'number' ? hoursUntilAppointment < 10 : true

    const depositAmount = Number.isFinite(booking.deposit) ? Number(booking.deposit) : 0
    booking.status = 'cancelled'
    booking.cancelledAt = now.toISOString()
    booking.cancelledBy = cancelledBy
    booking.cancellationReason = reason || null
    booking.refundStatus = depositAmount > 0 ? 'retained' : 'not_required'
    booking.refundAmount = 0
    booking.refundNotes = null

    let calendarEventRemoved = false
    if (booking.calendarEventId) {
      const calendar = await getCalendarClientWithWrite()

      if (calendar) {
        try {
          await calendar.events.delete({
            calendarId: CALENDAR_ID,
            eventId: booking.calendarEventId,
          })
          calendarEventRemoved = true
          booking.calendarEventId = null
        } catch (calendarError: any) {
          console.error('Failed to delete calendar event:', calendarError)
        }
      }
    }

    bookings[bookingIndex] = booking
    await writeDataFile('bookings.json', { bookings })
    try {
      await updateFullyBookedState(booking.date, bookings)
    } catch (error) {
      console.error('Failed to refresh fully booked dates after admin cancellation:', error)
    }
    await recordActivity({
      module: 'bookings',
      action: 'cancel',
      performedBy,
      summary: `Cancelled booking for ${booking.name}`,
      targetId: booking.id,
      targetType: 'booking',
      details: {
        cancellationReason: reason || null,
        refundStatus: booking.refundStatus,
        depositRetained: depositAmount,
        calendarEventRemoved,
        isLateCancellation,
      },
    })

    return NextResponse.json({
      success: true,
      booking,
      isLateCancellation,
      depositAmount,
      calendarEventRemoved,
    })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error cancelling booking:', error)
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }
}


