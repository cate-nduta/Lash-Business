import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const discounts = await readDataFile('discounts.json', {})
    return NextResponse.json(discounts)
  } catch (error) {
    console.error('Error loading discounts:', error)
    return NextResponse.json({ discounts: [] }, { status: 500 })
  }
}

