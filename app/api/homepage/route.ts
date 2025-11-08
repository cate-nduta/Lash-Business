import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const homepage = await readDataFile('homepage.json', {})
    return NextResponse.json(homepage)
  } catch (error) {
    console.error('Error loading homepage content:', error)
    return NextResponse.json({ homepage: null }, { status: 500 })
  }
}

