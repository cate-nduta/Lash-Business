import { NextRequest, NextResponse } from 'next/server'
import { readDataFilePreferRemote } from '@/lib/data-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const availability = await readDataFilePreferRemote('availability.json', {})
    return NextResponse.json(availability, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  }
}

