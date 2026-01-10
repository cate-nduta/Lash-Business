import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    // Revalidate all major paths
    revalidatePath('/')
    revalidatePath('/booking')
    revalidatePath('/services')
    revalidatePath('/gallery')
    revalidatePath('/contact')
    revalidatePath('/policies')
    revalidatePath('/terms')
    
    // Revalidate API routes
    revalidatePath('/api/services')
    revalidatePath('/api/availability')
    revalidatePath('/api/calendar/available-slots')
    revalidatePath('/api/discounts')
    revalidatePath('/api/settings')
    revalidatePath('/api/homepage')
    revalidatePath('/api/testimonials')
    revalidatePath('/api/gallery')
    revalidatePath('/api/policies')
    revalidatePath('/api/terms')
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
        },
      }
    )
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Also allow GET for easier access
  return POST(request)
}

















