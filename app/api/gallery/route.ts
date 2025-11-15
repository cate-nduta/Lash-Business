import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const gallery = await readDataFile<{ images: Array<{ url: string; name: string }> }>('gallery.json', { images: [] })
    // Ensure we always return the correct structure
    const galleryData = Array.isArray(gallery) ? { images: gallery } : (gallery?.images ? gallery : { images: [] })
    return NextResponse.json(galleryData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error loading gallery:', error)
    return NextResponse.json({ images: [] }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

