import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getCalendarClient } from '@/lib/google-calendar-client'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

// getCalendarClient is now imported from lib/google-calendar-client

interface Client {
  email: string
  name: string
  lastBookingDate?: string
  totalBookings: number
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const calendar = await getCalendarClient()
    if (!calendar) {
      return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const quarter = searchParams.get('quarter') // Format: "2024-Q1"
    const year = searchParams.get('year')

    // Get all events from the calendar
    const now = new Date()
    let timeMin: string
    let timeMax: string

    if (quarter && year) {
      // Calculate quarter dates
      const quarterNum = parseInt(quarter.replace('Q', ''))
      const yearNum = parseInt(year)
      const startMonth = (quarterNum - 1) * 3
      const endMonth = quarterNum * 3

      timeMin = new Date(yearNum, startMonth, 1).toISOString()
      timeMax = new Date(yearNum, endMonth, 0, 23, 59, 59).toISOString()
    } else {
      // Default: last 12 months
      const oneYearAgo = new Date(now)
      oneYearAgo.setFullYear(now.getFullYear() - 1)
      timeMin = oneYearAgo.toISOString()
      timeMax = now.toISOString()
    }

    const events = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const clientMap = new Map<string, Client>()

    // Extract client information from events
    for (const event of events.data.items || []) {
      const description = event.description || ''
      const summary = event.summary || ''

      // Try to extract email from description (common format: "Email: email@example.com")
      let email: string | null = null
      let name: string | null = null

      // Check description for email
      const emailMatch = description.match(/email[:\s]+([^\s\n<]+@[^\s\n>]+)/i)
      if (emailMatch) {
        email = emailMatch[1].toLowerCase().trim()
      }

      // Check description for name
      const nameMatch = description.match(/name[:\s]+([^\n]+)/i) || summary.match(/^([^:]+)/)
      if (nameMatch) {
        name = nameMatch[1].trim()
      }

      // Also check attendees
      if (event.attendees) {
        for (const attendee of event.attendees) {
          if (attendee.email && !attendee.email.includes('@gmail.com') && !attendee.email.includes('@calendar.google.com')) {
            email = attendee.email.toLowerCase().trim()
            name = attendee.displayName || name || (email ? email.split('@')[0] : '')
          }
        }
      }

      if (email && email.includes('@')) {
        const existing = clientMap.get(email)
        const eventDate = event.start?.dateTime || event.start?.date

        if (existing) {
          existing.totalBookings++
          if (eventDate && (!existing.lastBookingDate || eventDate > existing.lastBookingDate)) {
            existing.lastBookingDate = eventDate
          }
        } else {
          clientMap.set(email, {
            email,
            name: name || email.split('@')[0],
            lastBookingDate: eventDate || undefined,
            totalBookings: 1,
          })
        }
      }
    }

    // Also check local bookings.json for additional clients
    try {
      const localBookings = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
      for (const booking of localBookings.bookings || []) {
        if (booking.email) {
          const email = booking.email.toLowerCase().trim()
          const existing = clientMap.get(email)
          if (existing) {
            existing.totalBookings++
            if (booking.date && (!existing.lastBookingDate || booking.date > existing.lastBookingDate)) {
              existing.lastBookingDate = booking.date
            }
          } else {
            clientMap.set(email, {
              email,
              name: booking.name || email.split('@')[0],
              lastBookingDate: booking.date,
              totalBookings: 1,
            })
          }
        }
      }
    } catch (error) {
      console.warn('Error reading local bookings:', error)
    }

    const clients = Array.from(clientMap.values()).sort((a, b) => {
      // Sort by last booking date (most recent first)
      if (a.lastBookingDate && b.lastBookingDate) {
        return b.lastBookingDate.localeCompare(a.lastBookingDate)
      }
      if (a.lastBookingDate) return -1
      if (b.lastBookingDate) return 1
      return 0
    })

    return NextResponse.json({ clients, total: clients.length })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

