import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const discounts = await readDataFile('discounts.json', {})
    return NextResponse.json(discounts, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', // Cache for 1 minute, serve stale for 2 minutes
      },
    })
  } catch (error) {
    console.error('Error loading discounts:', error)
    return NextResponse.json({ discounts: [] }, { status: 500 })
  }
}

