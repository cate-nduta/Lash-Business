import { NextRequest, NextResponse } from 'next/server'
import { loadLabsGuide } from '@/lib/labs-guide-utils'

export const dynamic = 'force-dynamic'

// GET: Fetch guide scenarios (public)
export async function GET(request: NextRequest) {
  try {
    const guide = await loadLabsGuide()
    
    // Also fetch services to include service details
    const { readDataFile } = await import('@/lib/data-utils')
    const webServicesData = await readDataFile<any>('labs-web-services.json', { services: [] })
    
    return NextResponse.json({
      ...guide,
      services: webServicesData.services || [],
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error fetching labs guide:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guide', details: error.message },
      { status: 500 }
    )
  }
}

