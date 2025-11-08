import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailNotification } from '../../../booking/email/utils'
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

type RescheduleHistoryEntry = {
  fromDate: string
  fromTimeSlot: string
  toDate: string
  toTimeSlot: string
  rescheduledAt: string
  rescheduledBy: 'admin' | 'client'
  notes?: string | null
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const body = await request.json()
    const {
      bookingId,
      newDate,
      newTimeSlot,
      sendEmail = false,
      notes,
    } = body as {
      bookingId: string
      newDate: string
      newTimeSlot: string
      sendEmail?: boolean
      notes?: string
    }

    if (!bookingId || !newDate || !newTimeSlot) {
      return NextResponse.json(
        { error: 'Booking ID, new date, and new time are required.' },
        { status: 400 }
      )
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 })
    }

    const newStart = new Date(newTimeSlot)
    if (Number.isNaN(newStart.getTime())) {
      return NextResponse.json({ error: 'Invalid time slot.' }, { status: 400 })
    }

    if (newStart.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Cannot reschedule to a past time.' }, { status: 400 })
    }

    const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const bookings = data.bookings || []

    const bookingIndex = bookings.findIndex((b) => b.id === bookingId)
    if (bookingIndex === -1) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    const booking = bookings[bookingIndex]

    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cancelled bookings cannot be rescheduled.' },
        { status: 400 }
      )
    }

    const originalStart = new Date(booking.timeSlot)
    if (originalStart.getTime() === newStart.getTime()) {
      return NextResponse.json(
        { error: 'The new slot matches the current booking time.' },
        { status: 400 }
      )
    }

    const rescheduleHistory = Array.isArray(booking.rescheduleHistory)
      ? booking.rescheduleHistory
      : []

    const newEnd = new Date(newStart)
    newEnd.setHours(newEnd.getHours() + 2)

    const calendar = getCalendarClient()
    let calendarUpdated = false
    let calendarEventId = booking.calendarEventId || null

    if (calendar) {
      try {
        const descriptionLines = [
          `Client: ${booking.name}`,
          `Email: ${booking.email}`,
          `Phone: ${booking.phone}`,
          `Service: ${booking.service || 'Lash Service'}`,
          `Location: ${booking.location || 'Not specified'}`,
          `Deposit: KSH ${booking.deposit || 0}`,
        ]
        if (booking.notes) {
          descriptionLines.push(`Special Notes: ${booking.notes}`)
        }

        const eventPayload = {
          summary: `Lash Appointment - ${booking.name}`,
          description: descriptionLines.join('\n'),
          start: {
            dateTime: newStart.toISOString(),
            timeZone: 'Africa/Nairobi',
          },
          end: {
            dateTime: newEnd.toISOString(),
            timeZone: 'Africa/Nairobi',
          },
          attendees: [
            { email: process.env.GOOGLE_CALENDAR_EMAIL || 'catherinenkuria@gmail.com' },
            { email: booking.email },
          ],
        }

        if (calendarEventId) {
          await calendar.events.patch({
            calendarId: CALENDAR_ID,
            eventId: calendarEventId,
            requestBody: eventPayload,
            sendUpdates: 'all',
          })
        } else {
          const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            requestBody: eventPayload,
            sendUpdates: 'all',
          })
          calendarEventId = response.data.id || null
        }

        calendarUpdated = true
      } catch (calendarError) {
        console.error('Failed to update calendar event during reschedule:', calendarError)
      }
    }

    const nowISO = new Date().toISOString()

    const originalTimeFormatted = originalStart.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const newTimeFormatted = newStart.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    const defaultNote = `Rescheduled from ${booking.date} ${originalTimeFormatted} to ${newDate} ${newTimeFormatted} by admin.`

    const historyEntry: RescheduleHistoryEntry = {
      fromDate: booking.date,
      fromTimeSlot: booking.timeSlot,
      toDate: newDate,
      toTimeSlot: newStart.toISOString(),
      rescheduledAt: nowISO,
      rescheduledBy: 'admin',
      notes: notes || defaultNote,
    }

    rescheduleHistory.push(historyEntry)

    booking.date = newDate
    booking.timeSlot = newStart.toISOString()
    booking.calendarEventId = calendarEventId
    booking.rescheduledAt = nowISO
    booking.rescheduledBy = performedBy
    booking.rescheduleHistory = rescheduleHistory

    bookings[bookingIndex] = booking
    await writeDataFile('bookings.json', { bookings })

    if (sendEmail) {
      try {
        const emailResult = await sendEmailNotification({
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          service: booking.service || '',
          date: booking.date,
          timeSlot: booking.timeSlot,
          location: booking.location || '',
          isFirstTimeClient: booking.discountType === 'first-time',
          originalPrice: booking.originalPrice,
          discount: booking.discount,
          finalPrice: booking.finalPrice,
          deposit: booking.deposit,
        })

        if (!emailResult?.success) {
          console.warn('Reschedule email may not have been delivered:', emailResult?.error)
        }
      } catch (emailError) {
        console.error('Failed to send reschedule email:', emailError)
      }
    }

    await recordActivity({
      module: 'bookings',
      action: 'reschedule',
      performedBy,
      summary: `Rescheduled booking for ${booking.name} to ${newDate}`,
      targetId: booking.id,
      targetType: 'booking',
      details: {
        originalDate: historyEntry.fromDate,
        originalSlot: historyEntry.fromTimeSlot,
        newDate,
        newTimeSlot: historyEntry.toTimeSlot,
        calendarUpdated,
        emailSent: sendEmail,
        rescheduledBy: performedBy,
      },
    })

    return NextResponse.json({
      success: true,
      booking,
      calendarUpdated,
      emailSent: sendEmail,
    })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error rescheduling booking:', error)
    return NextResponse.json({ error: 'Failed to reschedule booking.' }, { status: 500 })
  }
}


