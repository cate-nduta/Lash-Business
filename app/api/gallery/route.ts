import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET(request: NextRequest) {
  try {
    const gallery = await readDataFile('gallery.json', [])
    return NextResponse.json(gallery)
  } catch (error) {
    console.error('Error loading gallery:', error)
    return NextResponse.json({ gallery: [] }, { status: 500 })
  }
}

