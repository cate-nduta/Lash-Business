/**
 * Appointment Reminder Cron Job
 * 
 * This endpoint sends email reminders 6 hours before appointments.
 * 
 * SETUP FOR NETLIFY:
 * 
 * Since Netlify doesn't have built-in cron jobs, you'll need to use an external
 * cron service. Here are the best options:
 * 
 * OPTION 1: cron-job.org (Free & Recommended)
 * 1. Go to https://cron-job.org and create a free account
 * 2. Click "Create cronjob"
 * 3. Configure:
 *    - Title: "LashDiary Appointment Reminders"
 *    - Address: https://yourdomain.com/api/cron/send-reminders
 *    - Schedule: Every hour (select "Hourly" or use cron: "0 * * * *")
 *    - Request method: GET
 *    - Optional: Add Authorization header if you set CRON_SECRET:
 *      Header name: Authorization
 *      Header value: Bearer YOUR_CRON_SECRET
 * 4. Click "Create cronjob"
 * 
 * OPTION 2: EasyCron (Free tier available)
 * 1. Go to https://www.easycron.com and sign up
 * 2. Create a new cron job:
 *    - URL: https://yourdomain.com/api/cron/send-reminders
 *    - Schedule: 0 * * * * (every hour)
 *    - Method: GET
 * 3. Save and activate
 * 
 * OPTION 3: UptimeRobot (Free - monitors + cron)
 * 1. Go to https://uptimerobot.com and sign up
 * 2. Add a new monitor:
 *    - Monitor Type: HTTP(s)
 *    - URL: https://yourdomain.com/api/cron/send-reminders
 *    - Monitoring Interval: 60 minutes
 * 
 * SECURITY (Optional but Recommended):
 * Add to your Netlify environment variables:
 * CRON_SECRET=your-random-secret-string-here
 * 
 * Then configure your cron service to send:
 * Authorization: Bearer your-random-secret-string-here
 * 
 * MANUAL TESTING:
 * Visit: https://yourdomain.com/api/cron/send-reminders
 * Or use curl:
 * curl https://yourdomain.com/api/cron/send-reminders
 * 
 * The system automatically:
 * - Checks for appointments 6 hours in the future
 * - Tracks sent reminders to avoid duplicates
 * - Sends beautiful reminder emails with appointment details
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailNotification } from '@/app/api/booking/email/utils'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'
// Reminder time: 6 hours before appointment
const REMINDER_TIMES = [6] // Hours before appointment

interface ReminderRecord {
  eventId: string
  email: string
  appointmentTime: string
  reminderHours: number // Which reminder this was (12 or 6)
  sentAt: string
}

interface ReminderTracking {
  reminders: ReminderRecord[]
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

// Parse booking information from event description
function parseBookingInfo(event: any): {
  name?: string
  email?: string
  phone?: string
  service?: string
  location?: string
  deposit?: number
  finalPrice?: number
} | null {
  const description = event.description || ''
  const summary = event.summary || ''
  
  // Try to extract information from description
  const nameMatch = description.match(/Client:\s*(.+)/i) || summary.match(/Lash Appointment\s*-\s*(.+)/i)
  const emailMatch = description.match(/Email:\s*([^\s\n]+)/i)
  const phoneMatch = description.match(/Phone:\s*([^\s\n]+)/i)
  const serviceMatch = description.match(/Service:\s*(.+)/i)
  const locationMatch = description.match(/Location:\s*(.+)/i)
  const depositMatch = description.match(/Deposit:\s*KSH\s*(\d+)/i)
  const priceMatch = description.match(/Final\s*price:\s*KSH\s*(\d+)/i) || description.match(/Fee:\s*KSH\s*(\d+)/i)
  
  // Also check attendees for email
  const attendeeEmail = event.attendees?.find((a: any) => a.email && !a.email.includes('lashdiary.co.ke'))?.email

  const name = nameMatch ? nameMatch[1].trim() : undefined
  const email = emailMatch ? emailMatch[1].trim() : attendeeEmail
  const phone = phoneMatch ? phoneMatch[1].trim() : undefined
  const service = serviceMatch ? serviceMatch[1].split('\n')[0].trim() : undefined
  const location = locationMatch ? locationMatch[1].split('\n')[0].trim() : undefined
  const deposit = depositMatch ? parseInt(depositMatch[1], 10) : undefined
  const finalPrice = priceMatch ? parseInt(priceMatch[1], 10) : undefined

  if (!email && !name) {
    return null
  }

  return {
    name: name || 'Valued Client',
    email,
    phone,
    service: service || 'Lash Service',
    location,
    deposit,
    finalPrice,
  }
}

export async function GET(request: NextRequest) {
  try {
    // Optional: Add a secret token check for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const calendar = getCalendarClient()
    if (!calendar) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar not configured',
        message: 'Reminder system requires Google Calendar API credentials',
      })
    }

    const now = new Date()
    
    // Load tracking data
    const trackingData = await readDataFile<ReminderTracking>('reminder-sent.json', { reminders: [] })
    const sentReminders = new Set(
      trackingData.reminders.map((r) => `${r.eventId}-${r.appointmentTime}-${r.reminderHours}h`)
    )

    // Process each reminder time (12 hours and 6 hours)
    const allEvents: Array<{ event: any; reminderHours: number }> = []
    
    for (const reminderHours of REMINDER_TIMES) {
      // Calculate time range: appointments starting in (reminderHours - 0.5) to (reminderHours + 0.5) hours
      // This gives us a 1-hour window to catch appointments exactly at the reminder time
      const minTime = new Date(now.getTime() + (reminderHours - 0.5) * 60 * 60 * 1000)
      const maxTime = new Date(now.getTime() + (reminderHours + 0.5) * 60 * 60 * 1000)

      console.log(`[Reminder Cron] Checking for ${reminderHours}h reminders between ${minTime.toISOString()} and ${maxTime.toISOString()}`)

      // Query Google Calendar for upcoming events
      const response = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: minTime.toISOString(),
        timeMax: maxTime.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      })

      const events = response.data.items || []
      console.log(`[Reminder Cron] Found ${events.length} events for ${reminderHours}h reminder window`)
      
      // Add events with their reminder time
      for (const event of events) {
        allEvents.push({ event, reminderHours })
      }
    }

    console.log(`[Reminder Cron] Total events to process: ${allEvents.length}`)

    const results = {
      checked: allEvents.length,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{ eventId: string; email?: string; reminderHours?: number; status: string; error?: string }>,
    }

    // Process each event
    for (const { event, reminderHours } of allEvents) {
      if (!event.id || !event.start?.dateTime) {
        continue
      }

      const eventId = event.id
      const appointmentTime = event.start.dateTime
      const reminderKey = `${eventId}-${appointmentTime}-${reminderHours}h`

      // Check if this specific reminder already sent
      if (sentReminders.has(reminderKey)) {
        console.log(`[Reminder Cron] ${reminderHours}h reminder already sent for event ${eventId}`)
        results.skipped++
        results.details.push({ eventId, reminderHours, status: 'skipped', email: 'already sent' })
        continue
      }

      // Parse booking information
      const bookingInfo = parseBookingInfo(event)
      if (!bookingInfo || !bookingInfo.email) {
        console.log(`[Reminder Cron] Could not parse booking info for event ${eventId}`)
        results.skipped++
        results.details.push({ eventId, status: 'skipped', email: 'no email found' })
        continue
      }

      try {
        // Format appointment date and time
        const appointmentDate = new Date(appointmentTime)
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })

        // Calculate end time (default 2 hours if not available)
        const endTime = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : new Date(appointmentDate.getTime() + 2 * 60 * 60 * 1000)
        const formattedEndTime = endTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })

        // Send reminder email
        const emailResult = await sendEmailNotification({
          name: bookingInfo.name || 'Valued Client',
          email: bookingInfo.email,
          phone: bookingInfo.phone || '',
          service: bookingInfo.service || 'Lash Service',
          date: appointmentDate.toISOString().split('T')[0],
          timeSlot: appointmentTime,
          location: bookingInfo.location || process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya',
          deposit: bookingInfo.deposit,
          finalPrice: bookingInfo.finalPrice,
          isReminder: true, // This triggers the reminder email template
          desiredLook: 'Custom',
          desiredLookStatus: 'custom',
        })

        if (emailResult?.success && emailResult?.customerEmailSent) {
          // Record that reminder was sent
          trackingData.reminders.push({
            eventId,
            email: bookingInfo.email,
            appointmentTime,
            reminderHours,
            sentAt: new Date().toISOString(),
          })

          // Keep only last 2000 reminders to prevent file from growing too large
          if (trackingData.reminders.length > 2000) {
            trackingData.reminders = trackingData.reminders.slice(-2000)
          }

          await writeDataFile('reminder-sent.json', trackingData)
          sentReminders.add(reminderKey)

          console.log(`[Reminder Cron] ✅ ${reminderHours}h reminder sent to ${bookingInfo.email} for appointment at ${formattedTime}`)
          results.sent++
          results.details.push({
            eventId,
            email: bookingInfo.email,
            reminderHours,
            status: 'sent',
          })
        } else {
          console.error(`[Reminder Cron] ❌ Failed to send ${reminderHours}h reminder to ${bookingInfo.email}:`, emailResult?.error)
          results.errors++
          results.details.push({
            eventId,
            email: bookingInfo.email,
            reminderHours,
            status: 'error',
            error: emailResult?.error || 'Unknown error',
          })
        }
      } catch (error: any) {
        console.error(`[Reminder Cron] ❌ Error processing event ${eventId} for ${reminderHours}h reminder:`, error)
        results.errors++
        results.details.push({
          eventId,
          email: bookingInfo.email,
          reminderHours,
          status: 'error',
          error: error.message || 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    })
  } catch (error: any) {
    console.error('[Reminder Cron] ❌ Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

