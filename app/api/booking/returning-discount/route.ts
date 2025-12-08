import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { getCalendarClient } from '@/lib/google-calendar-client'

export const revalidate = 0
export const dynamic = 'force-dynamic'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

// getCalendarClient is now imported from lib/google-calendar-client

const parseClientDate = (value: string | null) => {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get('email')
    const dateParam = searchParams.get('date')

    if (!emailParam || !emailParam.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 })
    }

    const targetDate = parseClientDate(dateParam)
    const email = emailParam.trim().toLowerCase()

    const [discountsConfig] = await Promise.all([
      readDataFile<Record<string, any>>('discounts.json', {}),
    ])
    
    const returningConfig = discountsConfig?.returningClientDiscount ?? {}
    const returningEnabled = returningConfig?.enabled !== false
    
    // Default to 7% for 30 days and 4% for 31-45 days if not configured
    const tier30Percentage = Number(
      returningConfig?.tier30Percentage ??
        returningConfig?.within30DaysPercentage ??
        7, // Default 7% for within 30 days
    )
    const tier45Percentage = Number(
      returningConfig?.tier45Percentage ??
        returningConfig?.within31To45DaysPercentage ??
        4, // Default 4% for 31-45 days
    )

    let lastAppointmentDate: string | null = null

    // Check Google Calendar for the last appointment date
    const calendar = await getCalendarClient()
    if (calendar) {
      try {
        // Search for past events with this email
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        
        const response = await calendar.events.list({
          calendarId: CALENDAR_ID,
          timeMin: oneYearAgo.toISOString(),
          timeMax: new Date().toISOString(), // Only past events
          maxResults: 2500,
          singleEvents: true,
          orderBy: 'startTime',
        })

        const events = response.data.items || []
        const matchingEvents: Array<{ date: Date; event: any }> = []

        // Find all events with this email
        for (const event of events) {
          const description = event.description || ''
          const summary = event.summary || ''
          const attendees = event.attendees || []
          
          // Check if email appears in description, summary, or attendees
          if (
            description.toLowerCase().includes(email.toLowerCase()) ||
            summary.toLowerCase().includes(email.toLowerCase()) ||
            attendees.some((attendee: any) => attendee.email?.toLowerCase() === email.toLowerCase())
          ) {
            // Get the event start date
            const startDate = event.start?.dateTime || event.start?.date
            if (startDate) {
              const eventDate = new Date(startDate)
              if (!isNaN(eventDate.getTime())) {
                matchingEvents.push({ date: eventDate, event })
              }
            }
          }
        }

        // Find the most recent appointment
        if (matchingEvents.length > 0) {
          matchingEvents.sort((a, b) => b.date.getTime() - a.date.getTime())
          const mostRecent = matchingEvents[0]
          lastAppointmentDate = mostRecent.date.toISOString().split('T')[0] // Format as YYYY-MM-DD
        }
      } catch (error) {
        console.warn('Error checking calendar for last appointment:', error)
        // Fall back to bookings.json if calendar check fails
      }
    }

    // Fallback: Check bookings.json if calendar didn't find anything
    if (!lastAppointmentDate) {
      const bookingsData = await readDataFile<{ bookings: Array<Record<string, any>> }>('bookings.json', { bookings: [] })
      const bookings = Array.isArray(bookingsData?.bookings) ? bookingsData.bookings : []

    for (const booking of bookings) {
      const bookingEmail =
        typeof booking?.email === 'string' ? booking.email.trim().toLowerCase() : null
      if (bookingEmail !== email) continue

        // Use the booking date as the appointment date
        const bookingDate = typeof booking?.date === 'string' ? booking.date : null
        if (bookingDate) {
          if (!lastAppointmentDate || bookingDate > lastAppointmentDate) {
            lastAppointmentDate = bookingDate
          }
        }
      }
    }

    let discountPercent = 0
    let daysSince: number | null = null

    if (returningEnabled && lastAppointmentDate && targetDate) {
      const lastApptDate = new Date(lastAppointmentDate)
      const diffMs = targetDate.getTime() - lastApptDate.getTime()
      daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (daysSince >= 0 && daysSince <= 30) {
        discountPercent = Math.max(0, tier30Percentage)
      } else if (daysSince >= 31 && daysSince <= 45) {
        discountPercent = Math.max(0, tier45Percentage)
      }
    }

    return NextResponse.json({
      lastPaidAt: lastAppointmentDate, // Keep field name for compatibility
      discountPercent,
      daysSince,
    })
  } catch (error) {
    console.error('Error loading returning discount:', error)
    return NextResponse.json({ error: 'Failed to calculate returning discount.' }, { status: 500 })
  }
}

