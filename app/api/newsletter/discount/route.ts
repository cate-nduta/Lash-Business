import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic' // Always fetch fresh data
export const revalidate = 0 // Don't cache this route

export async function GET() {
  try {
    // Public endpoint - no authentication required
    // Always read fresh data from settings file
    const settings = await readDataFile<any>('settings.json', {})
    const discountPercentage = typeof settings?.newsletter?.discountPercentage === 'number' 
      ? Math.max(0, Math.min(100, settings.newsletter.discountPercentage)) // Clamp between 0-100
      : 10 // Default to 10% if not set
    
    const response = NextResponse.json({ discountPercentage })
    // Set headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error fetching newsletter discount:', error)
    // Return default on error
    const response = NextResponse.json({ discountPercentage: 10 })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    return response
  }
}

