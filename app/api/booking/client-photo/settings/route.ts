export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

type ClientPhotoSettings = {
  sampleImageUrl?: string | null
  instructions?: string | null
}

export async function GET() {
  try {
    const data = await readDataFile<{ clientPhotoSettings?: ClientPhotoSettings }>('client-photos-settings.json', {})
    const settings = data.clientPhotoSettings || { sampleImageUrl: null, instructions: null }

    return NextResponse.json({
      success: true,
      sampleImageUrl: settings.sampleImageUrl || null,
      instructions: settings.instructions || null,
    })
  } catch (error) {
    console.error('Failed to load client photo settings:', error)
    return NextResponse.json(
      {
        success: false,
        sampleImageUrl: null,
        instructions: null,
        error: 'Unable to load photo guidelines.',
      },
      { status: 500 },
    )
  }
}


