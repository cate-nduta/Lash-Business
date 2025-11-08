import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const gallery = await readDataFile('gallery.json', [])
    return NextResponse.json(gallery)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading gallery:', error)
    return NextResponse.json({ gallery: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const gallery = await request.json()
    await writeDataFile('gallery.json', gallery)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving gallery:', error)
    return NextResponse.json({ error: 'Failed to save gallery' }, { status: 500 })
  }
}

