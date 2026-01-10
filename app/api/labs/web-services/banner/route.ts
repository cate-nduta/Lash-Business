import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface BannerSettings {
  enabled: boolean
  text: string
}

const DEFAULT_BANNER_SETTINGS: BannerSettings = {
  enabled: false,
  text: '',
}

// Public GET endpoint - no authentication required
export async function GET() {
  try {
    const data = await readDataFile<{ banner?: BannerSettings }>(
      'labs-web-services.json',
      { banner: DEFAULT_BANNER_SETTINGS }
    )
    
    const banner = data.banner || DEFAULT_BANNER_SETTINGS
    
    return NextResponse.json(banner, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error fetching banner settings:', error)
    return NextResponse.json(DEFAULT_BANNER_SETTINGS, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

// Admin POST endpoint - requires authentication
export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const body = await request.json()
    const { enabled, text } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    if (typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text must be a string' },
        { status: 400 }
      )
    }

    // Load existing web services data
    const data = await readDataFile<any>('labs-web-services.json', {})
    
    // Update banner settings
    data.banner = {
      enabled: enabled === true,
      text: text?.trim() || '',
    }

    // Save updated data
    await writeDataFile('labs-web-services.json', data)

    return NextResponse.json({
      success: true,
      banner: data.banner,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error updating banner settings:', error)
    return NextResponse.json(
      { error: 'Failed to update banner settings', details: error.message },
      { status: 500 }
    )
  }
}

