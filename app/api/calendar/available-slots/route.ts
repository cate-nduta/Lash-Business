import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { readDataFile } from '@/lib/data-utils'

export const runtime = 'nodejs'
export const revalidate = 0
export const dynamic = 'force-dynamic'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'
const CALENDAR_EMAIL = process.env.GOOGLE_CALENDAR_EMAIL || 'hello@lashdiary.co.ke'

type BookingWindowConfig = {
  current?: {
    startDate?: string
    endDate?: string
    label?: string
  }
  next?: {
    startDate?: string
    endDate?: string
    label?: string
    opensAt?: string
    emailSubject?: string
  }
  bookingLink?: string
}

type AvailabilityData = {
  minimumBookingDate?: string
  businessHours?: {
    [key: string]: { open: string; close: string; enabled: boolean }
  }
  timeSlots?: {
    weekdays?: Array<{ hour: number; minute: number; label: string }>
    monday?: Array<{ hour: number; minute: number; label: string }>
    tuesday?: Array<{ hour: number; minute: number; label: string }>
    wednesday?: Array<{ hour: number; minute: number; label: string }>
    thursday?: Array<{ hour: number; minute: number; label: string }>
    friday?: Array<{ hour: number; minute: number; label: string }>
    saturday?: Array<{ hour: number; minute: number; label: string }>
    sunday?: Array<{ hour: number; minute: number; label: string }>
  }
  fullyBookedDates?: string[]
  bookingWindow?: BookingWindowConfig
}

async function loadAvailabilityData(): Promise<AvailabilityData | null> {
  try {
    return await readDataFile<AvailabilityData>('availability.json', {})
  } catch (error) {
    console.warn('Error loading availability data, using defaults:', error)
    return null
  }
}

async function loadLocalBookings(): Promise<Array<{ date?: string | null; timeSlot?: string | null; status?: string | null }>> {
  try {
    const data = await readDataFile<{ bookings?: Array<{ date?: string | null; timeSlot?: string | null; status?: string | null }> }>('bookings.json', { bookings: [] })
    return Array.isArray(data.bookings) ? data.bookings : []
  } catch (error) {
    console.warn('Error loading local bookings:', error)
    return []
  }
}

function parseDateOnly(dateStr?: string | null) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const parsed = new Date(`${dateStr}T00:00:00+03:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function deriveWindowRange(bookingWindow?: BookingWindowConfig) {
  const start = parseDateOnly(bookingWindow?.current?.startDate)
  const end = parseDateOnly(bookingWindow?.current?.endDate)
  return { start, end }
}

function isDateWithinWindow(dateStr: string, bookingWindow?: BookingWindowConfig, minimumBookingDate?: string) {
  const target = parseDateOnly(dateStr)
  if (!target) return false
  
  // Check minimum booking date first
  if (minimumBookingDate) {
    const minimumDate = parseDateOnly(minimumBookingDate)
    if (minimumDate && target < minimumDate) return false
  }
  
  // Then check booking window
  if (!bookingWindow?.current) return true
  const start = parseDateOnly(bookingWindow.current.startDate)
  const end = parseDateOnly(bookingWindow.current.endDate)
  if (start && target < start) return false
  if (end && target > end) return false
  return true
}

// Initialize Google Calendar API
function getCalendarClient() {
  // Check if credentials are available
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
    return null // Return null if credentials aren't set up
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


// Calculate day of week from date components in Nairobi timezone (UTC+3)
// Returns 0 = Sunday, 1 = Monday, ..., 6 = Saturday
function getDayOfWeek(year: number, month: number, day: number): number {
  // Create a date string in YYYY-MM-DD format
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  
  // Create a date at noon in Nairobi timezone (UTC+3) to avoid edge cases
  // This ensures we're in the middle of the day in Nairobi
  const dateInNairobi = new Date(`${dateStr}T12:00:00+03:00`)
  
  // Use Intl.DateTimeFormat to get the weekday in Nairobi timezone
  // This properly handles timezone conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    weekday: 'long',
  })
  
  const weekdayName = formatter.format(dateInNairobi)
  
  // Convert weekday name to number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const weekdayMap: { [key: string]: number } = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
  }
  
  return weekdayMap[weekdayName] ?? 0
}

// Generate time slots for a specific date
// Monday-Thursday: Use weekdays time slots (shared)
// Friday: Use friday-specific time slots
// Saturday: Use saturday-specific time slots
// Sunday: Use sunday-specific time slots
// dateStr should be in YYYY-MM-DD format
async function generateTimeSlotsForDate(dateStr: string, availabilityData?: AvailabilityData | null): Promise<string[]> {
  const slots: string[] = []
  
  // Parse the date string to get year, month, day
  const [year, month, day] = dateStr.split('-').map(Number)
  
  // Calculate day of week in Nairobi timezone
  // This ensures consistent results regardless of server timezone
  const dayOfWeek = getDayOfWeek(year, month, day)
  const isSunday = dayOfWeek === 0
  const isSaturday = dayOfWeek === 6
  const isFriday = dayOfWeek === 5
  const isMondayToThursday = dayOfWeek >= 1 && dayOfWeek <= 4 // Monday=1, Tuesday=2, Wednesday=3, Thursday=4
  const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
  
  // Load availability data from availability.json first to check if Saturday is enabled
  if (availabilityData === undefined) {
    availabilityData = await loadAvailabilityData()
  }

  const defaultEnabled = {
    sunday: true,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
  } as const

  const dayEnabled =
    availabilityData?.businessHours?.[dayKey]?.enabled ??
    defaultEnabled[dayKey as keyof typeof defaultEnabled]

  if (!dayEnabled) {
    return []
  }

  // Check if Saturday is enabled (used for time slot selection below)
  const saturdayEnabled =
    availabilityData?.businessHours?.saturday?.enabled ??
    defaultEnabled.saturday

  // If Saturday is disabled, return empty slots
  if (isSaturday && !saturdayEnabled) {
    return []
  }

  // Use time slots from availability.json or fallback to defaults
  let timeSlots: Array<{ hour: number; minute: number; label: string }>
  
  if (isSunday) {
    // Sunday: Use sunday-specific slots
    timeSlots = availabilityData?.timeSlots?.sunday && availabilityData.timeSlots.sunday.length > 0
      ? availabilityData.timeSlots.sunday
      : [
      { hour: 12, minute: 30, label: '12:30 PM' },
      { hour: 15, minute: 0, label: '3:00 PM' },
      ]
  } else if (isSaturday && saturdayEnabled) {
    // Saturday: Use saturday-specific slots
    timeSlots =
      (availabilityData?.timeSlots?.saturday && availabilityData.timeSlots.saturday.length > 0
        ? availabilityData.timeSlots.saturday
        : undefined) ??
      [
      { hour: 9, minute: 30, label: '9:30 AM' },
      { hour: 12, minute: 0, label: '12:00 PM' },
      { hour: 14, minute: 30, label: '2:30 PM' },
      { hour: 16, minute: 30, label: '4:30 PM' },
      ]
  } else if (isFriday) {
    // Friday: Use friday-specific slots
    timeSlots =
      (availabilityData?.timeSlots?.friday && availabilityData.timeSlots.friday.length > 0
        ? availabilityData.timeSlots.friday
        : undefined) ??
      (availabilityData?.timeSlots?.weekdays && availabilityData.timeSlots.weekdays.length > 0
        ? availabilityData.timeSlots.weekdays
        : undefined) ??
      [
      { hour: 9, minute: 30, label: '9:30 AM' },
      { hour: 12, minute: 0, label: '12:00 PM' },
      { hour: 14, minute: 30, label: '2:30 PM' },
      { hour: 16, minute: 30, label: '4:30 PM' },
      ]
  } else if (isMondayToThursday) {
    // Monday-Thursday: Use weekdays slots (shared across all four days)
    // Check for individual day slots first (for backward compatibility), then fall back to weekdays
    const daySpecificSlots = availabilityData?.timeSlots?.[dayKey as keyof typeof availabilityData.timeSlots]
    timeSlots =
      (Array.isArray(daySpecificSlots) && daySpecificSlots.length > 0
        ? daySpecificSlots
        : undefined) ??
      (availabilityData?.timeSlots?.weekdays && availabilityData.timeSlots.weekdays.length > 0
        ? availabilityData.timeSlots.weekdays
        : [
      { hour: 9, minute: 30, label: '9:30 AM' },
      { hour: 12, minute: 0, label: '12:00 PM' },
      { hour: 14, minute: 30, label: '2:30 PM' },
      { hour: 16, minute: 30, label: '4:30 PM' },
        ])
  } else {
    // Fallback (shouldn't happen, but just in case)
    timeSlots = [
      { hour: 9, minute: 30, label: '9:30 AM' },
      { hour: 12, minute: 0, label: '12:00 PM' },
      { hour: 14, minute: 30, label: '2:30 PM' },
      { hour: 16, minute: 30, label: '4:30 PM' },
    ]
  }
  
  for (const slot of timeSlots) {
    // Create ISO string for this time slot in Nairobi timezone (UTC+3)
    // Format: YYYY-MM-DDTHH:MM:00+03:00
    const slotDateTime = `${dateStr}T${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}:00+03:00`
    slots.push(slotDateTime)
  }
  
  return slots
}

// Normalize a date string to a comparable format (UTC hour and minute)
function normalizeSlotForComparison(slotString: string): string {
  // Parse the slot string and convert to a comparable format
  const date = new Date(slotString)
  return Number.isNaN(date.getTime()) ? '' : date.getTime().toString()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const fullyBookedOnly = searchParams.get('fullyBookedOnly') === 'true'
    
    // If only fully booked dates are requested, return them IMMEDIATELY without any delay
    if (fullyBookedOnly) {
      const availabilityData = await loadAvailabilityData()
      const bookingWindow = availabilityData?.bookingWindow
      const minimumBookingDate = availabilityData?.minimumBookingDate
      const fullyBookedSet = new Set<string>(
        Array.isArray(availabilityData?.fullyBookedDates) ? availabilityData!.fullyBookedDates : [],
      )
      
      // Return immediately with short cache for performance
      return NextResponse.json(
        { 
          fullyBookedDates: Array.from(fullyBookedSet), 
          bookingWindow: bookingWindow ?? null, 
          minimumBookingDate: minimumBookingDate ?? null 
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
            'Pragma': 'no-cache',
          },
        }
      )
    }
    
    const availabilityData = await loadAvailabilityData()
    const localBookings = await loadLocalBookings()
    const bookingWindow = availabilityData?.bookingWindow
    const minimumBookingDate = availabilityData?.minimumBookingDate
    const { start: windowStartDate, end: windowEndDate } = deriveWindowRange(bookingWindow)
    
    // If no date provided, return available dates instead
    if (!dateParam) {
      // Return available dates quickly (no calendar check on initial load)
      // Calendar check happens on-demand when user selects a date
      const availableDates: { value: string; label: string }[] = []
      const fullyBookedSet = new Set<string>(
        Array.isArray(availabilityData?.fullyBookedDates) ? availabilityData!.fullyBookedDates : [],
      )
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // Reduce initial range to 14 days for faster loading (can be expanded later)
      const defaultEnd = new Date(today)
      defaultEnd.setDate(defaultEnd.getDate() + 14)
      const windowStart = windowStartDate && windowStartDate > today ? new Date(windowStartDate) : new Date(today)
      const endDate = windowEndDate ? new Date(windowEndDate) : defaultEnd
      if (endDate < windowStart) {
      return NextResponse.json({
        dates: [],
        fullyBookedDates: Array.from(fullyBookedSet),
        bookingWindow: bookingWindow ?? null,
        minimumBookingDate: minimumBookingDate ?? null,
      })
      }
      // Clone start for iteration
      let currentDate = new Date(windowStart)

      // Skip local bookings processing for initial load - it's not used for date filtering
      // Local bookings are only checked when fetching time slots for a specific date
      // This makes the initial date list load much faster

      // Generate dates based on business hours only (fast, no API calls, no booking checks)
      const formatLocalDateKey = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      while (currentDate <= endDate) {
        const dateStr = formatLocalDateKey(currentDate)
        if (!isDateWithinWindow(dateStr, bookingWindow, minimumBookingDate)) {
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }
        const [year, month, day] = dateStr.split('-').map(Number)
        
        const dayOfWeek = getDayOfWeek(year, month, day)
        const isSaturday = dayOfWeek === 6
        
        const saturdayEnabled = availabilityData?.businessHours?.saturday?.enabled === true
        
        if (isSaturday && !saturdayEnabled) {
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }

        const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
        const dayEnabled =
          availabilityData?.businessHours?.[dayKey]?.enabled ??
          (dayKey === 'saturday' ? false : true)

        if (dayEnabled && !fullyBookedSet.has(dateStr)) {
          const dateLabel = currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })
          availableDates.push({ value: dateStr, label: dateLabel })
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Return quickly with dates, calendar check happens asynchronously if needed
      // The calendar check can be done on-demand when user selects a date
      return NextResponse.json({
        dates: availableDates,
        fullyBookedDates: Array.from(fullyBookedSet),
        bookingWindow: bookingWindow ?? null,
        minimumBookingDate: minimumBookingDate ?? null,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60', // Cache for 30 seconds, serve stale for 1 minute
        },
      })
    }

    // Validate date format (should be YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }

    if (!isDateWithinWindow(dateParam, bookingWindow, minimumBookingDate)) {
      return NextResponse.json({ slots: [] })
    }

    // Parse the date string to get year, month, day
    const [year, month, day] = dateParam.split('-').map(Number)
    
    // Validate date components
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return NextResponse.json(
        { error: 'Invalid date' },
        { status: 400 }
      )
    }

    // Check if it's Saturday and if Saturday is enabled
    const dayOfWeek = getDayOfWeek(year, month, day)
    const isSaturday = dayOfWeek === 6
    
    if (Array.isArray(availabilityData?.fullyBookedDates) && availabilityData!.fullyBookedDates.includes(dateParam)) {
      return NextResponse.json({ slots: [] })
    }

    if (isSaturday) {
      const saturdayEnabled = availabilityData?.businessHours?.saturday?.enabled === true
      if (!saturdayEnabled) {
        return NextResponse.json({ slots: [] })
      }
    }

    // Check if date is in the past (compare dates, not times)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDateLocal = new Date(dateParam + 'T00:00:00')
    selectedDateLocal.setHours(0, 0, 0, 0)
    if (selectedDateLocal < today) {
      return NextResponse.json({ slots: [] })
    }

    // Generate time slots for the selected date (pass date string, not Date object)
    const allSlots = await generateTimeSlotsForDate(dateParam, availabilityData)
    
    // If no slots generated, return early
    if (allSlots.length === 0) {
      return NextResponse.json({ slots: [] })
    }
    
    // Try to fetch booked slots from Google Calendar (with fallback if API fails)
    let bookedSlots = new Set<string>()
    
    try {
      const calendar = getCalendarClient()
      if (calendar) {
        const startOfDay = new Date(selectedDateLocal)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(selectedDateLocal)
        endOfDay.setHours(23, 59, 59, 999)

        const response = await calendar.events.list({
          calendarId: CALENDAR_ID,
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        })

        const events = response.data.items || []

        // Extract booked time slots
        events.forEach((event) => {
          if (event.start?.dateTime) {
            const eventStart = new Date(event.start.dateTime)
            // Normalize to exact time for comparison (including minutes)
            const normalized = normalizeSlotForComparison(eventStart.toISOString())
            bookedSlots.add(normalized)
          }
        })
      }
    } catch (calendarError) {
      // If Google Calendar API fails, log but continue with all slots available
      console.warn('Google Calendar API error (using fallback):', calendarError)
      // Continue without filtering - all slots will show as available
    }

    // Filter out booked slots and past times
    const now = new Date()
    const todayStr = today.toDateString()
    const selectedDateStr = selectedDateLocal.toDateString()
    
    localBookings.forEach((booking) => {
      if (booking?.timeSlot && booking.status !== 'cancelled') {
        const bookingDate = booking.date
          ? booking.date
          : booking.timeSlot.split('T')[0]
        if (bookingDate === dateParam) {
          const normalized = normalizeSlotForComparison(booking.timeSlot)
          bookedSlots.add(normalized)
        }
      }
    })
    
    // Enforce 24-hour advance booking requirement
    const MIN_ADVANCE_BOOKING_HOURS = 24
    const minBookingTime = new Date(now.getTime() + MIN_ADVANCE_BOOKING_HOURS * 60 * 60 * 1000)
    
    const availableSlots = allSlots
      .filter(slot => {
        // Check if slot is booked (normalize for comparison)
        const normalizedSlot = normalizeSlotForComparison(slot)
        if (bookedSlots.has(normalizedSlot)) {
          return false
        }
        
        const slotTime = new Date(slot)
        
        // Enforce 24-hour advance booking: filter out slots less than 24 hours away
        if (slotTime.getTime() <= minBookingTime.getTime()) {
          return false
        }
        
        // Only check if slot is in the past if the selected date is today
        // For future dates, don't filter based on time
        if (selectedDateStr === todayStr) {
          // Compare in Nairobi timezone - convert both to Nairobi time for accurate comparison
          const slotTimeInNairobi = new Date(slot) // slot is already in Nairobi timezone (+03:00)
          if (slotTimeInNairobi <= now) {
            return false
          }
        }
        
        return true
      })
      .map(slot => {
        // Extract time directly from the slot string (format: YYYY-MM-DDTHH:MM:00+03:00)
        // This avoids timezone conversion issues
        const timeMatch = slot.match(/T(\d{2}):(\d{2}):/)
        if (!timeMatch) {
          // Fallback to Date parsing if format is unexpected
          const slotTime = new Date(slot)
          const hours = slotTime.getUTCHours()
          const minutes = slotTime.getUTCMinutes()
          const ampm = hours >= 12 ? 'PM' : 'AM'
          const displayHours = hours % 12 || 12
          const displayMinutes = minutes.toString().padStart(2, '0')
          const label = `${displayHours}:${displayMinutes} ${ampm}`
          return { value: slot, label }
        }
        
        const hours = parseInt(timeMatch[1], 10)
        const minutes = parseInt(timeMatch[2], 10)
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours % 12 || 12
        const displayMinutes = minutes.toString().padStart(2, '0')
        const label = `${displayHours}:${displayMinutes} ${ampm}`
        
        return {
          value: slot,
          label: label,
        }
      })

    return NextResponse.json({ slots: availableSlots, bookingWindow: bookingWindow ?? null }, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30', // Cache for 10 seconds, serve stale for 30 seconds
      },
    })
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available slots', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

