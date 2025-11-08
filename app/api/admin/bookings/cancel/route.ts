import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { google } from 'googleapis'
import { recordActivity } from '@/lib/activity-log'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

function getCalendarClient() {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
    return null
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID,
      },
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
    })

    return google.calendar({ version: 'v3', auth })
  } catch (error) {
    console.error('Unable to initialize Google Calendar client:', error)
    return null
  }
}

type RefundAction = 'retain' | 'refund_now' | 'refund_pending'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const body = await request.json()
    const {
      bookingId,
      reason,
      refundAction,
      refundAmount,
      refundNotes,
      cancelledBy = 'admin',
    } = body as {
      bookingId: string
      reason?: string
      refundAction: RefundAction
      refundAmount?: number
      refundNotes?: string
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
    const action: RefundAction = refundAction || 'retain'

    let resolvedRefundAmount = depositAmount
    if (typeof refundAmount === 'number' && refundAmount >= 0) {
      resolvedRefundAmount = refundAmount
    }

    let refundStatus: 'not_required' | 'not_applicable' | 'pending' | 'refunded' | 'retained' = 'not_required'
    if (depositAmount > 0) {
      switch (action) {
        case 'refund_now':
          refundStatus = 'refunded'
          break
        case 'refund_pending':
          refundStatus = 'pending'
          break
        case 'retain':
        default:
          refundStatus = 'retained'
          resolvedRefundAmount = 0
          break
      }
    }

    booking.status = 'cancelled'
    booking.cancelledAt = now.toISOString()
    booking.cancelledBy = cancelledBy
    booking.cancellationReason = reason || null
    booking.refundStatus = depositAmount > 0 ? refundStatus : 'not_required'
    booking.refundAmount = depositAmount > 0 ? resolvedRefundAmount : 0
    booking.refundNotes = refundNotes || null

    let calendarEventRemoved = false
    if (booking.calendarEventId) {
      const calendar = getCalendarClient()

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
        refundAmount: booking.refundAmount,
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


