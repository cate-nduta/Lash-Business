import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

// Normalize date to YYYY-MM-DD format
function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  
  // Try to parse and normalize the date
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    
    // Return in YYYY-MM-DD format
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    // If parsing fails, try to extract YYYY-MM-DD pattern
    const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
    return dateStr.trim() // Return as-is if we can't normalize
  }
}

// Normalize time slot to lowercase
function normalizeTime(timeStr: string | null | undefined): string | null {
  if (!timeStr || typeof timeStr !== 'string') return null
  return timeStr.toLowerCase().trim()
}

// Calculate day of week from date components in Nairobi timezone (UTC+3)
// Returns 0 = Sunday, 1 = Monday, ..., 6 = Saturday
function getDayOfWeek(year: number, month: number, day: number): number {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const dateInNairobi = new Date(`${dateStr}T12:00:00+03:00`)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    weekday: 'long',
  })
  const weekdayName = formatter.format(dateInNairobi)
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

export async function GET(request: NextRequest) {
  try {
    // Load availability settings - support both old and new structure
    const availabilityData: any = await readDataFile('labs-consultation-availability.json', {
      availableDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      timeSlots: {
        weekdays: [
          { hour: 9, minute: 30, label: '9:30 AM' },
          { hour: 12, minute: 0, label: '12:00 PM' },
          { hour: 15, minute: 30, label: '3:30 PM' },
        ],
      },
      blockedDates: [],
    })

    // Load consultations and showcase bookings in parallel (non-blocking)
    const consultationsPromise = readDataFile<{ consultations: any[] }>('labs-consultations.json', { consultations: [] })
    const showcaseBookingsPromise = readDataFile<Array<{ appointmentDate?: string; appointmentTime?: string; timeSlot?: string; status?: string }>>('labs-showcase-bookings.json', [])
    
    // Generate available dates FIRST (fast, synchronous calculation)
    const availableDates: string[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 90)

    const blockedDatesSet = new Set<string>(availabilityData.blockedDates || [])
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    // Support both old structure (availableDays) and new structure (dailyAvailability)
    const getDayAvailable = (dayName: string): boolean => {
      // Try new structure first
      if (availabilityData.dailyAvailability?.[dayName]?.enabled === true) {
        const timeSlots = availabilityData.dailyAvailability[dayName].timeSlots || []
        return timeSlots.length > 0
      }
      // Fall back to old structure
      return availabilityData.availableDays?.[dayName as keyof typeof availabilityData.availableDays] === true
    }

    const currentDate = new Date(today)
    while (currentDate <= endDate) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
      
      if (blockedDatesSet.has(dateStr)) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      const dayOfWeek = getDayOfWeek(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        currentDate.getDate()
      )
      const dayName = dayNames[dayOfWeek]
      
      if (getDayAvailable(dayName)) {
        availableDates.push(dateStr)
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Load consultations and showcase bookings (already started in parallel)
    const consultationsData = await consultationsPromise
    const showcaseBookings = await showcaseBookingsPromise
    
    // Extract booked slots from consultations (optimized)
    // IMPORTANT: Block ALL non-cancelled consultations to prevent double booking
    // This ensures slots are immediately unavailable once booked, even if payment is pending
    const consultationBookedSlots = consultationsData.consultations
      .filter(c => {
        if (!c.preferredDate || !c.preferredTime) return false
        const status = c.status?.toLowerCase()
        // Block ALL non-cancelled consultations (pending, pending_payment, confirmed, etc.)
        // Only cancelled consultations don't block slots
        return status !== 'cancelled'
      })
      .map(c => ({
        date: normalizeDate(c.preferredDate) || c.preferredDate,
        time: normalizeTime(c.preferredTime) || c.preferredTime,
      }))
      .filter(slot => slot.date && slot.time)

    // Extract booked slots from showcase bookings
    // IMPORTANT: Block ALL non-cancelled bookings to prevent double booking
    const showcaseBookedSlots = showcaseBookings
      .filter(b => {
        if (!b.appointmentDate || !b.appointmentTime) return false
        const status = b.status?.toLowerCase()
        // Block ALL non-cancelled bookings (pending, confirmed, etc.)
        // Only cancelled bookings don't block slots
        return status !== 'cancelled'
      })
      .map(b => {
        // Normalize the date to YYYY-MM-DD format
        // appointmentDate is stored as ISO string, need to extract YYYY-MM-DD
        let normalizedDate: string | null = null
        
        if (b.appointmentDate) {
          // Try normalizeDate first (handles YYYY-MM-DD format)
          normalizedDate = normalizeDate(b.appointmentDate)
          
          // If that didn't work, try parsing as ISO string
          if (!normalizedDate) {
            try {
              const date = new Date(b.appointmentDate)
              if (!isNaN(date.getTime())) {
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                normalizedDate = `${year}-${month}-${day}`
              }
            } catch {
              // If parsing fails, try to extract YYYY-MM-DD from string
              const dateMatch = b.appointmentDate.match(/(\d{4}-\d{2}-\d{2})/)
              if (dateMatch) {
                normalizedDate = dateMatch[1]
              }
            }
          }
        }
        
        // appointmentTime is stored as label like "9:30 AM"
        const timeLabel = b.appointmentTime || ''
        
        return {
          date: normalizedDate || b.appointmentDate,
          time: normalizeTime(timeLabel) || timeLabel,
        }
      })
      .filter(slot => slot.date && slot.time)

    // Combine booked slots from both consultations and showcase bookings
    const bookedSlots = [...consultationBookedSlots, ...showcaseBookedSlots]

    // Extract booked dates from consultations
    // IMPORTANT: Block ALL non-cancelled consultations to prevent double booking
    const consultationBookedDates = consultationsData.consultations
      .filter(c => {
        if (!c.preferredDate) return false
        const status = c.status?.toLowerCase()
        // Block ALL non-cancelled consultations (pending, pending_payment, confirmed, etc.)
        // Only cancelled consultations don't block dates
        return status !== 'cancelled'
      })
      .map(c => normalizeDate(c.preferredDate) || c.preferredDate)
      .filter((date): date is string => !!date)

    // Extract booked dates from showcase bookings
    // IMPORTANT: Block ALL non-cancelled bookings to prevent double booking
    const showcaseBookedDates = showcaseBookings
      .filter(b => {
        if (!b.appointmentDate) return false
        const status = b.status?.toLowerCase()
        // Block ALL non-cancelled bookings (pending, confirmed, etc.)
        // Only cancelled bookings don't block dates
        return status !== 'cancelled'
      })
      .map(b => normalizeDate(b.appointmentDate) || b.appointmentDate)
      .filter((date): date is string => !!date)

    // Combine booked dates from both
    const bookedDates = Array.from(new Set([...consultationBookedDates, ...showcaseBookedDates]))

    // Get time slots (support both structures)
    // Check timeSlots.weekdays first (this is what the admin panel uses)
    let timeSlots: Array<{ hour: number; minute: number; label: string }> = []
    
    if (availabilityData.timeSlots?.weekdays && 
        Array.isArray(availabilityData.timeSlots.weekdays) &&
        availabilityData.timeSlots.weekdays.length > 0) {
      timeSlots = availabilityData.timeSlots.weekdays
    } else if (availabilityData.dailyAvailability?.monday?.timeSlots && 
               Array.isArray(availabilityData.dailyAvailability.monday.timeSlots) &&
               availabilityData.dailyAvailability.monday.timeSlots.length > 0) {
      // Fallback to dailyAvailability structure if weekdays not found
      timeSlots = availabilityData.dailyAvailability.monday.timeSlots
    } else {
      // Default time slots if none configured: 9:30 AM, 12:00 PM, 3:30 PM
      timeSlots = [
        { hour: 9, minute: 30, label: '9:30 AM' },
        { hour: 12, minute: 0, label: '12:00 PM' },
        { hour: 15, minute: 30, label: '3:30 PM' },
      ]
    }

    return NextResponse.json({
      bookedDates,
      bookedSlots,
      availableDates,
      timeSlots,
      blockedDates: availabilityData.blockedDates || [],
      minimumBookingDate: availabilityData.minimumBookingDate || null,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0', // No cache to ensure fresh data
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error loading consultation availability:', error)
    return NextResponse.json(
      { error: 'Failed to load availability', bookedDates: [], bookedSlots: [], availableDates: [], timeSlots: [], blockedDates: [], minimumBookingDate: null },
      { status: 500 }
    )
  }
}

