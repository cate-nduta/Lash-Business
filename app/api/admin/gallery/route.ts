import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdminAuth()
    const gallery = readDataFile('gallery.json')
    return NextResponse.json(gallery)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const gallery = await request.json()
    writeDataFile('gallery.json', gallery)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save gallery' }, { status: 500 })
  }
}

