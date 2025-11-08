import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET(request: NextRequest) {
  try {
    const availability = await readDataFile('availability.json', {})
    return NextResponse.json(availability)
  } catch (error) {
    console.error('Error loading availability:', error)
    return NextResponse.json({ availability: [] }, { status: 500 })
  }
}

