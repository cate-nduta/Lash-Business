import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const availability = await readDataFile('availability.json', {})
    return NextResponse.json(availability, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error loading availability:', error)
    return NextResponse.json({ availability: [] }, { status: 500 })
  }
}

