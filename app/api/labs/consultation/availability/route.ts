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

export async function GET(request: NextRequest) {
  try {
    // Load all consultations
    const consultationsData = await readDataFile<{ consultations: any[] }>('labs-consultations.json', { consultations: [] })
    
    // Extract booked date+time combinations - only count confirmed consultations (not pending or cancelled)
    const bookedSlots = consultationsData.consultations
      .filter(consultation => {
        // Must have both date and time
        if (!consultation.preferredDate || !consultation.preferredTime) return false
        
        // Must be confirmed (not pending, not cancelled, and not undefined/null)
        // Only count consultations that are explicitly confirmed
        const status = consultation.status?.toLowerCase()
        if (status === 'cancelled') return false
        // If status is undefined/null, assume it's confirmed (for backward compatibility with old data)
        // If status is 'pending', don't count it as booked yet
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
      .filter(slot => slot.date && slot.time) // Remove any invalid entries

    // Also keep bookedDates for backward compatibility (dates that are fully booked)
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
      .filter((date, index, self) => self.indexOf(date) === index) // Remove duplicates

    return NextResponse.json({
      bookedDates, // For backward compatibility
      bookedSlots, // New: specific date+time combinations
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
      { error: 'Failed to load availability', bookedDates: [], bookedSlots: [] },
      { status: 500 }
    )
  }
}

