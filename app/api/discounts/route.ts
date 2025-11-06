import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET() {
  try {
    const discounts = readDataFile('discounts.json')
    return NextResponse.json(discounts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load discounts' }, { status: 500 })
  }
}

