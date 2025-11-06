import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET() {
  try {
    const gallery = readDataFile('gallery.json')
    return NextResponse.json(gallery)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load gallery' }, { status: 500 })
  }
}

