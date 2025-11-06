import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET() {
  try {
    const availability = readDataFile('availability.json')
    return NextResponse.json(availability)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }
}

