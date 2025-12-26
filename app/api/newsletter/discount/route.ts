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
      : 5 // Default to 5% if not set
    const enabled = typeof settings?.newsletter?.enabled === 'boolean' 
      ? settings.newsletter.enabled 
      : true // Default to enabled if not set
    
    const response = NextResponse.json({ discountPercentage, enabled })
    // Set headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error fetching newsletter discount:', error)
    // Return default on error
    const response = NextResponse.json({ discountPercentage: 5, enabled: true })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    return response
  }
}

