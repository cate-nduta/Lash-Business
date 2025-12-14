import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Serve favicon.ico at root level for Google search results
 * Google specifically looks for /favicon.ico to display in search listings
 */
export async function GET(request: NextRequest) {
  try {
    // Get favicon from settings
    const settings = await readDataFile<any>('settings.json', {})
    const faviconUrl = typeof settings?.business?.faviconUrl === 'string' 
      ? settings.business.faviconUrl 
      : null

    if (faviconUrl) {
      // Remove leading slash if present
      const cleanPath = faviconUrl.startsWith('/') ? faviconUrl.slice(1) : faviconUrl
      const filePath = join(process.cwd(), 'public', cleanPath)
      
      try {
        const fileBuffer = await readFile(filePath)
        const fileExtension = cleanPath.split('.').pop()?.toLowerCase()
        
        // Determine content type
        // For Google search results, we serve SVG as image/svg+xml but also allow it as favicon
        let contentType = 'image/x-icon'
        if (fileExtension === 'svg') {
          // Google accepts SVG for favicons, serve it with proper type
          contentType = 'image/svg+xml'
        } else if (fileExtension === 'png') {
          contentType = 'image/png'
        } else if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
          contentType = 'image/jpeg'
        }
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            // Important: Allow cross-origin for Google to fetch
            'Access-Control-Allow-Origin': '*',
          },
        })
      } catch (fileError) {
        console.warn('Could not read favicon file:', fileError)
      }
    }
    
    // Fallback: return 404 if no favicon found
    // This allows browsers to use their default favicon
    return new NextResponse(null, { status: 404 })
  } catch (error) {
    console.error('Error serving favicon:', error)
    return new NextResponse(null, { status: 404 })
  }
}

