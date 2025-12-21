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
    // Load availability settings
    const availabilityData = await readDataFile('labs-consultation-availability.json', {
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
        weekdays: [],
      },
      blockedDates: [],
    })

    // Load all consultations
    const consultationsData = await readDataFile<{ consultations: any[] }>('labs-consultations.json', { consultations: [] })
    
    // Extract booked date+time combinations - only count confirmed consultations (not pending or cancelled)
    const bookedSlots = consultationsData.consultations
      .filter(consultation => {
        // Must have both date and time
        if (!consultation.preferredDate || !consultation.preferredTime) return false
        
        // Must be confirmed (not pending, not cancelled, and not undefined/null)
        const status = consultation.status?.toLowerCase()
        if (status === 'cancelled') return false
        if (status === 'pending') return false
        
        return true
      })
      .map(consultation => {
        const normalizedDate = normalizeDate(consultation.preferredDate)
        const normalizedTime = normalizeTime(consultation.preferredTime)
        
        return {
          date: normalizedDate || consultation.preferredDate,
          time: normalizedTime || consultation.preferredTime,
        }
      })
      .filter(slot => slot.date && slot.time)

    // Also keep bookedDates for backward compatibility
    const bookedDates = consultationsData.consultations
      .filter(consultation => {
        if (!consultation.preferredDate) return false
        const status = consultation.status?.toLowerCase()
        if (status === 'cancelled') return false
        if (status === 'pending') return false
        return true
      })
      .map(consultation => normalizeDate(consultation.preferredDate) || consultation.preferredDate)
      .filter((date): date is string => !!date)
      .filter((date, index, self) => self.indexOf(date) === index)

    // Generate available dates based on availability settings
    const availableDates: string[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 90) // Next 90 days

    const blockedDatesSet = new Set<string>(availabilityData.blockedDates || [])
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    let currentDate = new Date(today)
    while (currentDate <= endDate) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
      
      // Skip if blocked
      if (blockedDatesSet.has(dateStr)) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      // Check if day is available
      const dayOfWeek = getDayOfWeek(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        currentDate.getDate()
      )
      const dayName = dayNames[dayOfWeek]
      const dayAvailable = availabilityData.availableDays?.[dayName as keyof typeof availabilityData.availableDays] === true

      if (dayAvailable) {
        availableDates.push(dateStr)
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Get available time slots
    const timeSlots = availabilityData.timeSlots?.weekdays || []

    return NextResponse.json({
      bookedDates, // For backward compatibility
      bookedSlots, // Specific date+time combinations
      availableDates, // Dates that are available based on settings
      timeSlots, // Available time slots
      blockedDates: availabilityData.blockedDates || [], // Blocked dates
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error loading consultation availability:', error)
    return NextResponse.json(
      { error: 'Failed to load availability', bookedDates: [], bookedSlots: [], availableDates: [], timeSlots: [], blockedDates: [] },
      { status: 500 }
    )
  }
}

