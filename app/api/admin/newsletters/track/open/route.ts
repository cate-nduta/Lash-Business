export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface Newsletter {
  id: string
  title: string
  description?: string
  pdfUrl: string
  thumbnailUrl?: string
  imagePages?: Array<{
    pageNumber: number
    imageUrl: string
    width: number
    height: number
  }>
  createdAt: string
  sentAt?: string
  totalRecipients?: number
  opened?: number
  clicked?: number
}

interface NewsletterTracking {
  newsletterId: string
  email: string
  opened: boolean
  openedAt: string | null
  clicked: boolean
  clickedAt: string | null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const newsletterId = searchParams.get('newsletter')
    const email = searchParams.get('email')

    if (!newsletterId || !email) {
      return new Response('', {
        status: 204,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Expires: '0',
          Pragma: 'no-cache',
        },
      })
    }

    const newslettersData = await readDataFile<{ newsletters: Newsletter[] }>('newsletters.json', {
      newsletters: [],
    })
    const newsletters = newslettersData.newsletters || []
    const newsletter = newsletters.find((n) => n.id === newsletterId)

    if (newsletter) {
      const trackingData = await readDataFile<{ trackings: NewsletterTracking[] }>('newsletter-tracking.json', {
        trackings: [],
      })
      const trackings = trackingData.trackings || []
      const existingTracking = trackings.find(
        (t) => t.newsletterId === newsletterId && t.email.toLowerCase() === email.toLowerCase()
      )

      if (!existingTracking) {
        trackings.push({
          newsletterId,
          email: email.toLowerCase(),
          opened: true,
          openedAt: new Date().toISOString(),
          clicked: false,
          clickedAt: null,
        })
        newsletter.opened = (newsletter.opened || 0) + 1
        await writeDataFile('newsletter-tracking.json', { trackings })
        await writeDataFile('newsletters.json', { newsletters })
      } else if (!existingTracking.opened) {
        existingTracking.opened = true
        existingTracking.openedAt = new Date().toISOString()
        newsletter.opened = (newsletter.opened || 0) + 1
        await writeDataFile('newsletter-tracking.json', { trackings })
        await writeDataFile('newsletters.json', { newsletters })
      }
    }

    const transparentPixel = Buffer.from(
      'R0lGODlhAQABAIAAAP///////ywAAAAAAQABAAACAUwAOw==',
      'base64'
    )

    return new NextResponse(transparentPixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': transparentPixel.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Expires: '0',
        Pragma: 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error tracking newsletter open:', error)
    return new NextResponse(null, { status: 204 })
  }
}

