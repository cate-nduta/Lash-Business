import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

type ClientPhotoSettings = {
  sampleImageUrl?: string | null
  instructions?: string | null
}

export async function GET() {
  try {
    await requireAdminAuth()
    const data = await readDataFile<{ clientPhotoSettings?: ClientPhotoSettings }>('client-photos-settings.json', {})
    return NextResponse.json({
      success: true,
      settings: {
        sampleImageUrl: data.clientPhotoSettings?.sampleImageUrl || null,
        instructions: data.clientPhotoSettings?.instructions || '',
      },
    })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Failed to load client photo settings:', error)
    return NextResponse.json({ error: 'Could not load settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const instructions =
      typeof body?.instructions === 'string' && body.instructions.trim().length > 0
        ? body.instructions.trim()
        : null

    const data = await readDataFile<{ clientPhotoSettings?: ClientPhotoSettings }>('client-photos-settings.json', {})
    const updated = {
      clientPhotoSettings: {
        sampleImageUrl: data.clientPhotoSettings?.sampleImageUrl || null,
        instructions,
      },
    }
    await writeDataFile('client-photos-settings.json', updated)

    return NextResponse.json({ success: true, settings: updated.clientPhotoSettings })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Failed to save client photo instructions:', error)
    return NextResponse.json({ error: 'Could not save settings' }, { status: 500 })
  }
}


