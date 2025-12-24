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
        weekdays: [],
      },
      blockedDates: [],
    })

    // Load consultations in parallel (non-blocking)
    const consultationsPromise = readDataFile<{ consultations: any[] }>('labs-consultations.json', { consultations: [] })
    
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

    let currentDate = new Date(today)
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

    // Load consultations (already started in parallel)
    const consultationsData = await consultationsPromise
    
    // Extract booked slots (optimized)
    const bookedSlots = consultationsData.consultations
      .filter(c => {
        if (!c.preferredDate || !c.preferredTime) return false
        const status = c.status?.toLowerCase()
        return status !== 'cancelled' && status !== 'pending'
      })
      .map(c => ({
        date: normalizeDate(c.preferredDate) || c.preferredDate,
        time: normalizeTime(c.preferredTime) || c.preferredTime,
      }))
      .filter(slot => slot.date && slot.time)

    const bookedDates = Array.from(new Set(
      consultationsData.consultations
        .filter(c => c.preferredDate && c.status?.toLowerCase() !== 'cancelled' && c.status?.toLowerCase() !== 'pending')
        .map(c => normalizeDate(c.preferredDate) || c.preferredDate)
        .filter((date): date is string => !!date)
    ))

    // Get time slots (support both structures)
    const timeSlots = availabilityData.dailyAvailability?.monday?.timeSlots || 
                     availabilityData.timeSlots?.weekdays || 
                     []

    return NextResponse.json({
      bookedDates,
      bookedSlots,
      availableDates,
      timeSlots,
      blockedDates: availabilityData.blockedDates || [],
      minimumBookingDate: availabilityData.minimumBookingDate || null,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60', // Cache for faster loads
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

