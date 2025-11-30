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
    const url = searchParams.get('url')

    if (!newsletterId || !email || !url) {
      return NextResponse.redirect(new URL('/', request.url))
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

      if (!existingTracking || !existingTracking.clicked) {
        if (existingTracking) {
          existingTracking.clicked = true
          existingTracking.clickedAt = new Date().toISOString()
        } else {
          trackings.push({
            newsletterId,
            email: email.toLowerCase(),
            opened: false,
            openedAt: null,
            clicked: true,
            clickedAt: new Date().toISOString(),
          })
        }
        await writeDataFile('newsletter-tracking.json', { trackings })

        const wasNotClicked = !existingTracking || !existingTracking.clicked
        if (wasNotClicked) {
          newsletter.clicked = (newsletter.clicked || 0) + 1
          await writeDataFile('newsletters.json', { newsletters })
        }
      }
    }

    return NextResponse.redirect(new URL(url, request.url))
  } catch (error) {
    console.error('Error tracking newsletter click:', error)
    const url = request.nextUrl.searchParams.get('url')
    if (url) {
      try {
        return NextResponse.redirect(new URL(url, request.url))
      } catch {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
    return NextResponse.redirect(new URL('/', request.url))
  }
}

