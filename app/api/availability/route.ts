import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const runtime = 'nodejs'
export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const availability = await readDataFile('availability.json', {})
    return NextResponse.json(availability, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', // Cache for 1 minute, serve stale for 2 minutes
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  }
}

