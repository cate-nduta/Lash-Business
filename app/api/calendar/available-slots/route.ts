import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { readDataFile } from '@/lib/data-utils'

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
  businessHours?: {
    [key: string]: { open: string; close: string; enabled: boolean }
  }
  timeSlots?: {
    weekdays?: Array<{ hour: number; minute: number; label: string }>
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

function isDateWithinWindow(dateStr: string, bookingWindow?: BookingWindowConfig) {
  if (!bookingWindow?.current) return true
  const target = parseDateOnly(dateStr)
  if (!target) return false
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
// Weekdays (Mon-Fri): 9:30 AM, 12:00 PM, 2:30 PM, 4:30 PM
// Sunday: 12:30 PM, 3:00 PM
// Saturday: Closed (no slots)
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
  const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
  
  console.log(`[DEBUG generateTimeSlotsForDate] Date: ${dateStr}, Year: ${year}, Month: ${month}, Day: ${day}`)
  console.log(`[DEBUG generateTimeSlotsForDate] DayOfWeek: ${dayOfWeek} (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)`)
  console.log(`[DEBUG generateTimeSlotsForDate] isSunday: ${isSunday}, isSaturday: ${isSaturday}`)
  
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
    console.log(`[DEBUG generateTimeSlotsForDate] ${dayKey} disabled - returning empty slots`)
    return []
  }

  // Check if Saturday is enabled (used for time slot selection below)
  const saturdayEnabled =
    availabilityData?.businessHours?.saturday?.enabled ??
    defaultEnabled.saturday

  // If Saturday is disabled, return empty slots
  if (isSaturday && !saturdayEnabled) {
    console.log(`[DEBUG generateTimeSlotsForDate] Saturday detected and disabled - returning empty slots`)
    return []
  }

  // Use time slots from availability.json or fallback to defaults
  let timeSlots: Array<{ hour: number; minute: number; label: string }>
  
  if (isSunday) {
    timeSlots = availabilityData?.timeSlots?.sunday && availabilityData.timeSlots.sunday.length > 0
      ? availabilityData.timeSlots.sunday
      : [
      { hour: 12, minute: 30, label: '12:30 PM' },
      { hour: 15, minute: 0, label: '3:00 PM' },
      ]
  } else if (isSaturday && saturdayEnabled) {
    // Use Saturday-specific slots if available, otherwise use weekday slots
    timeSlots =
      (availabilityData?.timeSlots?.saturday && availabilityData.timeSlots.saturday.length > 0
        ? availabilityData.timeSlots.saturday
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
  } else {
    // Weekdays (Mon-Fri)
    timeSlots =
      availabilityData?.timeSlots?.weekdays && availabilityData.timeSlots.weekdays.length > 0
        ? availabilityData.timeSlots.weekdays
        : [
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
    const availabilityData = await loadAvailabilityData()
    const localBookings = await loadLocalBookings()
    const bookingWindow = availabilityData?.bookingWindow
    const { start: windowStartDate, end: windowEndDate } = deriveWindowRange(bookingWindow)
    
    // If only fully booked dates are requested, return them quickly
    if (fullyBookedOnly) {
      const fullyBookedSet = new Set<string>(
        Array.isArray(availabilityData?.fullyBookedDates) ? availabilityData!.fullyBookedDates : [],
      )
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const defaultEnd = new Date(today)
      defaultEnd.setDate(defaultEnd.getDate() + 30)
      const rangeStart = windowStartDate && windowStartDate > today ? new Date(windowStartDate) : new Date(today)
      const rangeEnd = windowEndDate ? new Date(windowEndDate) : defaultEnd

      if (rangeEnd < rangeStart) {
        return NextResponse.json({ fullyBookedDates: Array.from(fullyBookedSet), bookingWindow: bookingWindow ?? null })
      }
      
      const calendar = getCalendarClient()
      if (!calendar) {
        return NextResponse.json({ fullyBookedDates: Array.from(fullyBookedSet) })
      }
      
      // Batch check dates (check multiple dates in one API call if possible)
      const currentDate = new Date(rangeStart)
      const datesToCheck: string[] = []
      
      while (currentDate <= rangeEnd) {
        const dateStr = currentDate.toISOString().split('T')[0]
        if (!isDateWithinWindow(dateStr, bookingWindow)) {
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }
        const [year, month, day] = dateStr.split('-').map(Number)
        const dayOfWeek = getDayOfWeek(year, month, day)
        const isSaturday = dayOfWeek === 6
        
        const saturdayEnabled = availabilityData?.businessHours?.saturday?.enabled === true

        if (!isSaturday || saturdayEnabled) {
          datesToCheck.push(dateStr)
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Check dates in batches to reduce API calls
      const batchSize = 7 // Check a week at a time
      for (let i = 0; i < datesToCheck.length; i += batchSize) {
        const batch = datesToCheck.slice(i, i + batchSize)
        const startDate = new Date(batch[0] + 'T00:00:00')
        const endBatchDate = new Date(batch[batch.length - 1] + 'T23:59:59')
        
        try {
          const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: startDate.toISOString(),
            timeMax: endBatchDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
          })
          
          const events = response.data.items || []
          const bookedSlotsByDate = new Map<string, Set<string>>()
          
          const addBookedSlot = (slotIso: string | null | undefined) => {
            if (!slotIso) return
            const eventDate = new Date(slotIso)
            const dateKey = eventDate.toISOString().split('T')[0]
            if (!bookedSlotsByDate.has(dateKey)) {
              bookedSlotsByDate.set(dateKey, new Set())
            }
            const normalized = normalizeSlotForComparison(eventDate.toISOString())
            bookedSlotsByDate.get(dateKey)!.add(normalized)
          }

          events.forEach((event) => {
            if (event.start?.dateTime) {
              addBookedSlot(event.start.dateTime)
            }
          })
          
          localBookings.forEach((booking) => {
            if (booking?.timeSlot && booking.status && booking.status !== 'cancelled') {
              const slotDate = booking.date
                ? `${booking.date}T${booking.timeSlot.split('T')[1]}`
                : booking.timeSlot
              addBookedSlot(slotDate)
            }
          })
          
          // Check each date in batch
          for (const dateStr of batch) {
            const allSlots = await generateTimeSlotsForDate(dateStr, availabilityData)
            const bookedSlots = bookedSlotsByDate.get(dateStr) || new Set()
            
            const availableSlots = allSlots.filter(slot => {
              const normalizedSlot = normalizeSlotForComparison(slot)
              return !bookedSlots.has(normalizedSlot)
            })
            
            if (availableSlots.length === 0 && allSlots.length > 0) {
              fullyBookedSet.add(dateStr)
            }
          }
        } catch (error) {
          console.warn(`Error checking batch starting at ${batch[0]}:`, error)
        }
      }
      
      return NextResponse.json({ fullyBookedDates: Array.from(fullyBookedSet), bookingWindow: bookingWindow ?? null })
    }
    
    // If no date provided, return available dates instead
    if (!dateParam) {
      // Return available dates for the next 30 days (weekdays only)
      // Check which dates have all slots booked
      const availableDates: { value: string; label: string }[] = []
      const fullyBookedSet = new Set<string>(
        Array.isArray(availabilityData?.fullyBookedDates) ? availabilityData!.fullyBookedDates : [],
      )
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const defaultEnd = new Date(today)
      defaultEnd.setDate(defaultEnd.getDate() + 30)
      const windowStart = windowStartDate && windowStartDate > today ? new Date(windowStartDate) : new Date(today)
      const endDate = windowEndDate ? new Date(windowEndDate) : defaultEnd
      if (endDate < windowStart) {
        return NextResponse.json({
          dates: [],
          fullyBookedDates: Array.from(fullyBookedSet),
          bookingWindow: bookingWindow ?? null,
        })
      }
      // Clone start for iteration
      let currentDate = new Date(windowStart)

      const calendar = getCalendarClient()
      const localBookedByDate = new Map<string, Set<string>>()
      localBookings.forEach((booking) => {
        if (!booking?.timeSlot || booking.status === 'cancelled') return
        const normalized = normalizeSlotForComparison(booking.timeSlot)
        const dateKey = booking.date ? booking.date : booking.timeSlot.split('T')[0]
        if (!localBookedByDate.has(dateKey)) {
          localBookedByDate.set(dateKey, new Set())
        }
        localBookedByDate.get(dateKey)!.add(normalized)
      })

      const calendarBookedByDate = new Map<string, Set<string>>()

      if (calendar) {
        const calendarStart = new Date(windowStart)
        calendarStart.setHours(0, 0, 0, 0)
        const calendarEnd = new Date(endDate)
        calendarEnd.setHours(23, 59, 59, 999)

        const addCalendarSlot = (slotIso: string | undefined | null) => {
          if (!slotIso) return
          const dateKey = slotIso.substring(0, 10)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return
          if (!calendarBookedByDate.has(dateKey)) {
            calendarBookedByDate.set(dateKey, new Set())
          }
          const normalized = normalizeSlotForComparison(slotIso)
          if (normalized) {
            calendarBookedByDate.get(dateKey)!.add(normalized)
          }
        }

        let pageToken: string | undefined
        do {
          const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: calendarStart.toISOString(),
            timeMax: calendarEnd.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            pageToken,
          })
          const events = response.data.items || []
          events.forEach((event) => {
            if (event.start?.dateTime) {
              addCalendarSlot(event.start.dateTime)
            } else if (event.start?.date) {
              // All-day event: mark entire day as blocked
              addCalendarSlot(`${event.start.date}T00:00:00+03:00`)
            }
          })
          pageToken = response.data.nextPageToken ?? undefined
        } while (pageToken)
      }
      
      const formatLocalDateKey = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      while (currentDate <= endDate) {
        // Get date string in YYYY-MM-DD format using local calendar (avoid UTC shift)
        const dateStr = formatLocalDateKey(currentDate)
        if (!isDateWithinWindow(dateStr, bookingWindow)) {
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }
        const [year, month, day] = dateStr.split('-').map(Number)
        
        // Calculate day of week using timezone-independent method
        const dayOfWeek = getDayOfWeek(year, month, day)
        const isSaturday = dayOfWeek === 6
        
        // Skip Saturdays (closed)
        if (isSaturday) {
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }
          
          const allSlots = await generateTimeSlotsForDate(dateStr, availabilityData)
          if (allSlots.length === 0) {
            currentDate.setDate(currentDate.getDate() + 1)
            continue
          }

          const bookedSlots = new Set<string>()
          const calendarBooked = calendarBookedByDate.get(dateStr)
          if (calendarBooked) {
            calendarBooked.forEach((slot) => bookedSlots.add(slot))
          }
          const localBooked = localBookedByDate.get(dateStr)
          if (localBooked) {
            localBooked.forEach((slot) => bookedSlots.add(slot))
          }

          const availableSlotsForDay = allSlots.filter((slot) => {
            const normalizedSlot = normalizeSlotForComparison(slot)
            return !bookedSlots.has(normalizedSlot)
          })
          const isFullyBooked = availableSlotsForDay.length === 0
          
        if (isFullyBooked) {
          fullyBookedSet.add(dateStr)
        } else {
          availableDates.push({
            value: dateStr,
            label: currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          })
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      return NextResponse.json({ 
        dates: availableDates,
        fullyBookedDates: Array.from(fullyBookedSet),
        bookingWindow: bookingWindow ?? null,
      })
    }

    // Validate date format (should be YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }

    if (!isDateWithinWindow(dateParam, bookingWindow)) {
      return NextResponse.json({ slots: [] })
    }

    // Parse the date string to get year, month, day
    const [year, month, day] = dateParam.split('-').map(Number)
    
    console.log(`[DEBUG GET] Received date parameter: ${dateParam}, parsed as Year: ${year}, Month: ${month}, Day: ${day}`)
    
    // Validate date components
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      console.log(`[DEBUG GET] Invalid date components`)
      return NextResponse.json(
        { error: 'Invalid date' },
        { status: 400 }
      )
    }

    // Check if it's Saturday and if Saturday is enabled
    const dayOfWeek = getDayOfWeek(year, month, day)
    const isSaturday = dayOfWeek === 6
    console.log(`[DEBUG GET] Calculated day of week: ${dayOfWeek} (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)`)
    
    if (Array.isArray(availabilityData?.fullyBookedDates) && availabilityData!.fullyBookedDates.includes(dateParam)) {
      console.log(`[DEBUG GET] Date ${dateParam} is manually marked as fully booked.`)
      return NextResponse.json({ slots: [] })
    }

    if (isSaturday) {
      const saturdayEnabled = availabilityData?.businessHours?.saturday?.enabled === true
      if (!saturdayEnabled) {
        console.log(`[DEBUG GET] Saturday detected and disabled - returning empty slots`)
        return NextResponse.json({ slots: [] })
      }
      console.log(`[DEBUG GET] Saturday detected and enabled - generating slots`)
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
    console.log(`[DEBUG] Date: ${dateParam}, Generated ${allSlots.length} slots:`, allSlots)
    
    // If no slots generated, return early
    if (allSlots.length === 0) {
      console.log(`[DEBUG] No slots generated for ${dateParam}. Day of week: ${getDayOfWeek(year, month, day)}`)
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
        console.log(`[DEBUG] Found ${events.length} calendar events for ${dateParam}`)

        // Extract booked time slots
        events.forEach((event) => {
          if (event.start?.dateTime) {
            const eventStart = new Date(event.start.dateTime)
            // Normalize to exact time for comparison (including minutes)
            const normalized = normalizeSlotForComparison(eventStart.toISOString())
            bookedSlots.add(normalized)
            console.log(`[DEBUG] Booked slot: ${event.start.dateTime} -> ${normalized}`)
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
    console.log(`[DEBUG] Filtering: Today=${todayStr}, Selected=${selectedDateStr}, Now=${now.toISOString()}`)
    console.log(`[DEBUG] All slots before filtering:`, allSlots)
    
    localBookings.forEach((booking) => {
      if (booking?.timeSlot && booking.status !== 'cancelled') {
        const bookingDate = booking.date
          ? booking.date
          : booking.timeSlot.split('T')[0]
        if (bookingDate === dateParam) {
          const normalized = normalizeSlotForComparison(booking.timeSlot)
          bookedSlots.add(normalized)
          console.log(`[DEBUG] Local booking slot filtered: ${booking.timeSlot} -> ${normalized}`)
        }
      }
    })
    
    const availableSlots = allSlots
      .filter(slot => {
        // Check if slot is booked (normalize for comparison)
        const normalizedSlot = normalizeSlotForComparison(slot)
        if (bookedSlots.has(normalizedSlot)) {
          console.log(`[DEBUG] Slot ${slot} filtered out: booked (normalized: ${normalizedSlot})`)
          return false
        }
        
        // Only check if slot is in the past if the selected date is today
        // For future dates, don't filter based on time
        if (selectedDateStr === todayStr) {
          const slotTime = new Date(slot)
          // Compare in Nairobi timezone - convert both to Nairobi time for accurate comparison
          const slotTimeInNairobi = new Date(slot) // slot is already in Nairobi timezone (+03:00)
          if (slotTimeInNairobi <= now) {
            console.log(`[DEBUG] Slot ${slot} filtered out: past time (slotTime=${slotTimeInNairobi.toISOString()}, now=${now.toISOString()})`)
            return false
          }
        }
        
        console.log(`[DEBUG] Slot ${slot} is available (normalized: ${normalizedSlot})`)
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

    console.log(`[DEBUG] Final result: ${availableSlots.length} available slots out of ${allSlots.length} total`)
    console.log(`[DEBUG] Available slots array:`, JSON.stringify(availableSlots, null, 2))
    return NextResponse.json({ slots: availableSlots, bookingWindow: bookingWindow ?? null })
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available slots', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

