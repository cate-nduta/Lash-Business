import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

type ClientPhotoEntry = {
  id: string
  bookingId?: string
  name: string
  email: string
  phone?: string
  service?: string
  appointmentDate?: string
  uploadedAt: string
  photoUrl: string
  filename?: string
}

export async function GET() {
  try {
    await requireAdminAuth()
    const data = await readDataFile<{ entries?: ClientPhotoEntry[] }>('client-photos.json', { entries: [] })
    return NextResponse.json({
      success: true,
      entries: Array.isArray(data.entries) ? data.entries : [],
    })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Failed to load client photos:', error)
    return NextResponse.json({ error: 'Could not load client photos' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing photo id' }, { status: 400 })
    }

    const data = await readDataFile<{ entries?: ClientPhotoEntry[] }>('client-photos.json', { entries: [] })
    const entries = Array.isArray(data.entries) ? data.entries : []
    const updatedEntries = entries.filter((entry) => entry.id !== id)

    await writeDataFile('client-photos.json', { entries: updatedEntries })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Failed to delete client photo entry:', error)
    return NextResponse.json({ error: 'Could not delete entry' }, { status: 500 })
  }
}


