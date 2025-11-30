export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { readDataFile } from '@/lib/data-utils'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

interface UnsubscribeRecord {
  email: string
  name?: string
  reason?: string
  token: string
  unsubscribedAt: string
  originallyUnsubscribedAt?: string // Track when they first unsubscribed (permanent)
}

// Initialize Google Calendar API
function getCalendarClient() {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
    return null
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })

  return google.calendar({ version: 'v3', auth })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // CRITICAL: Check if email has ever unsubscribed
    // If they've unsubscribed before (even if they resubscribed), they are NOT eligible for first-time discounts
    try {
      const unsubscribeData = await readDataFile<{ unsubscribes: UnsubscribeRecord[] }>(
        'email-unsubscribes.json',
        { unsubscribes: [] }
      )
      
      const hasEverUnsubscribed = unsubscribeData.unsubscribes.some(
        (record) => 
          record.email.toLowerCase() === normalizedEmail &&
          record.originallyUnsubscribedAt // If they've ever unsubscribed, mark them as not first-time
      )

      if (hasEverUnsubscribed) {
        // They've unsubscribed before - NOT eligible for first-time discounts
        return NextResponse.json({ 
          isFirstTime: false,
          email,
          reason: 'Has previously unsubscribed from newsletter'
        })
      }
    } catch (error) {
      console.warn('Error checking unsubscribe records:', error)
      // Continue with other checks if unsubscribe check fails
    }

    // Check if this email has made a booking before
    const calendar = getCalendarClient()
    let isFirstTime = true

    if (calendar) {
      try {
        // Search for events with this email in the description or summary
        // We'll search events from the past to see if this email has booked before
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        
        const response = await calendar.events.list({
          calendarId: CALENDAR_ID,
          timeMin: oneYearAgo.toISOString(),
          maxResults: 2500, // Maximum allowed
          singleEvents: true,
          orderBy: 'startTime',
        })

        const events = response.data.items || []
        
        // Check if any event contains this email
        for (const event of events) {
          const description = event.description || ''
          const summary = event.summary || ''
          const attendees = event.attendees || []
          
          // Check if email appears in description, summary, or attendees
          if (
            description.toLowerCase().includes(email.toLowerCase()) ||
            summary.toLowerCase().includes(email.toLowerCase()) ||
            attendees.some(attendee => attendee.email?.toLowerCase() === email.toLowerCase())
          ) {
            isFirstTime = false
            break
          }
        }
      } catch (error) {
        console.warn('Error checking calendar for existing bookings:', error)
        // If we can't check, assume it's a first-time client (safer to give discount)
        isFirstTime = true
      }
    }

    return NextResponse.json({ 
      isFirstTime,
      email 
    })
  } catch (error) {
    console.error('Error checking first-time client status:', error)
    // Default to first-time client if there's an error (safer to give discount)
    return NextResponse.json({ 
      isFirstTime: true,
      error: 'Could not verify client status, applying first-time discount'
    })
  }
}

