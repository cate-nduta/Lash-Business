import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const runtime = 'nodejs'
export const revalidate = 30 // Revalidate every 30 seconds (availability changes frequently)

export async function GET(request: NextRequest) {
  try {
    const availability = await readDataFile('availability.json', {})
    return NextResponse.json(availability, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Error loading availability:', error)
    return NextResponse.json(
      {
        businessHours: {},
        timeSlots: {},
        bookingWindow: {},
        fullyBookedDates: [],
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
        },
      }
    )
  }
}

