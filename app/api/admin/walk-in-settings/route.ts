import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

interface WalkInSettings {
  walkInFee: number
  updatedAt: string
}

const DEFAULT_SETTINGS: WalkInSettings = {
  walkInFee: 1000,
  updatedAt: '',
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const settings = await readDataFile<WalkInSettings>(
      'walk-in-settings.json',
      DEFAULT_SETTINGS
    )
    return NextResponse.json(settings)
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading walk-in settings:', error)
    return NextResponse.json(DEFAULT_SETTINGS, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const { walkInFee } = body

    if (typeof walkInFee !== 'number' || walkInFee < 0) {
      return NextResponse.json({ error: 'Invalid walk-in fee' }, { status: 400 })
    }

    const settings: WalkInSettings = {
      walkInFee,
      updatedAt: new Date().toISOString(),
    }

    await writeDataFile('walk-in-settings.json', settings)
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving walk-in settings:', error)
    return NextResponse.json({ error: 'Failed to save walk-in settings' }, { status: 500 })
  }
}

