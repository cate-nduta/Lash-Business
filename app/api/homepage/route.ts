import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET() {
  try {
    const homepage = readDataFile('homepage.json')
    return NextResponse.json(homepage)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load homepage content' }, { status: 500 })
  }
}

