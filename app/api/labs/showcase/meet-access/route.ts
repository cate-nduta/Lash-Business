import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Time window for joining: 15 minutes before to 1 hour after scheduled time
const JOIN_WINDOW_BEFORE_MINUTES = 15
const JOIN_WINDOW_AFTER_MINUTES = 60

function formatTimeRemaining(targetDate: Date): string {
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()
  
  if (diff <= 0) {
    return 'Your meeting time has passed. Please contact us to reschedule.'
  }
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `Your meeting is in ${days} day${days > 1 ? 's' : ''} and ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`
  } else if (hours > 0) {
    return `Your meeting is in ${hours} hour${hours > 1 ? 's' : ''} and ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`
  } else {
    return `Your meeting is in ${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatTime(timeStr: string): string {
  try {
    // Try to parse as time label (e.g., "9:30 AM")
    const time = new Date(`2000-01-01T${timeStr}`)
    if (!isNaN(time.getTime())) {
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    }
    return timeStr
  } catch {
    return timeStr
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    // Load showcase bookings
    const showcaseBookings = await readDataFile<Array<{
      bookingId: string
      clientName: string
      clientEmail: string
      meetingType: string
      appointmentDate: string
      appointmentTime: string
      meetLink?: string | null
      status: string
    }>>('labs-showcase-bookings.json', [])

    // Find the booking
    const booking = showcaseBookings.find(
      (b) => b.bookingId === bookingId
    )

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Only check time for online meetings
    if (booking.meetingType !== 'online') {
      return NextResponse.json(
        { error: 'This is not an online meeting' },
        { status: 400 }
      )
    }

    // Check if meeting link exists
    if (!booking.meetLink) {
      return NextResponse.json(
        { 
          error: 'Meeting link not available',
          booking: {
            bookingId: booking.bookingId,
            clientName: booking.clientName,
            appointmentDate: booking.appointmentDate,
            appointmentTime: booking.appointmentTime,
            meetingType: booking.meetingType,
          },
          canJoin: false,
          message: 'Meeting link is being set up. Please contact us if you need assistance.',
        },
        { status: 200 }
      )
    }

    // Parse the scheduled date and time
    const appointmentDate = new Date(booking.appointmentDate)
    const appointmentTimeStr = booking.appointmentTime
    
    // Parse time string (e.g., "9:30 AM" or "14:30")
    let meetingStart: Date
    try {
      // Try to parse as "HH:MM AM/PM" format
      const timeMatch = appointmentTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10)
        const minutes = parseInt(timeMatch[2], 10)
        const period = timeMatch[3].toUpperCase()
        
        if (period === 'PM' && hours !== 12) {
          hours += 12
        } else if (period === 'AM' && hours === 12) {
          hours = 0
        }
        
        meetingStart = new Date(appointmentDate)
        meetingStart.setHours(hours, minutes, 0, 0)
      } else {
        // Try to parse as "HH:MM" format
        const [hours, minutes] = appointmentTimeStr.split(':').map(Number)
        meetingStart = new Date(appointmentDate)
        meetingStart.setHours(hours || 10, minutes || 0, 0, 0)
      }
    } catch {
      // Default to 10:00 AM if parsing fails
      meetingStart = new Date(appointmentDate)
      meetingStart.setHours(10, 0, 0, 0)
    }
    
    // Set the end time (1 hour after start)
    const meetingEnd = new Date(meetingStart)
    meetingEnd.setHours(meetingEnd.getHours() + 1)

    // Calculate join window
    const joinWindowStart = new Date(meetingStart)
    joinWindowStart.setMinutes(joinWindowStart.getMinutes() - JOIN_WINDOW_BEFORE_MINUTES)
    
    const joinWindowEnd = new Date(meetingEnd)
    joinWindowEnd.setMinutes(joinWindowEnd.getMinutes() + JOIN_WINDOW_AFTER_MINUTES)

    // Check current time
    const now = new Date()
    
    let canJoin = false
    let message = ''
    let timeRemaining = ''
    let meetingHasPassed = false

    // First check if the meeting end time has passed
    if (now > meetingEnd) {
      // Meeting has already ended
      meetingHasPassed = true
      canJoin = false
      message = `This meeting has already passed. Your scheduled time slot was ${formatDate(booking.appointmentDate)} at ${formatTime(booking.appointmentTime)}. Please contact us if you need to reschedule.`
    } else if (now < joinWindowStart) {
      // Too early
      canJoin = false
      message = `Your meeting is scheduled for ${formatDate(booking.appointmentDate)} at ${formatTime(booking.appointmentTime)}. Please join during your scheduled time.`
      timeRemaining = formatTimeRemaining(joinWindowStart)
    } else if (now > joinWindowEnd) {
      // Too late
      canJoin = false
      message = `Your meeting time slot has ended. The meeting window was ${formatDate(booking.appointmentDate)} at ${formatTime(booking.appointmentTime)}. Please contact us if you need to reschedule.`
      meetingHasPassed = true
    } else {
      // Within join window
      canJoin = true
      message = 'You can now join your meeting!'
    }

    return NextResponse.json({
      booking: {
        bookingId: booking.bookingId,
        clientName: booking.clientName,
        appointmentDate: booking.appointmentDate,
        appointmentTime: booking.appointmentTime,
        meetingType: booking.meetingType,
        meetLink: booking.meetLink,
      },
      canJoin,
      message,
      timeRemaining,
      meetingHasPassed,
      scheduledTime: `${formatDate(booking.appointmentDate)} at ${formatTime(booking.appointmentTime)}`,
      meetingEndTime: meetingEnd.toISOString(),
    })
  } catch (error: any) {
    console.error('Error checking meeting access:', error)
    return NextResponse.json(
      { error: 'Failed to verify meeting access' },
      { status: 500 }
    )
  }
}


