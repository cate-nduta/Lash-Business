import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface EmailCampaign {
  id: string
  subject: string
  content: string
  recipientType: 'all' | 'first-time' | 'returning'
  sentAt: string | null
  createdAt: string
  totalRecipients: number
  opened: number
  clicked: number
  notOpened: number
}

interface EmailTracking {
  campaignId: string
  email: string
  opened: boolean
  openedAt: string | null
  clicked: boolean
  clickedAt: string | null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('campaign')
    const email = searchParams.get('email')

    if (!campaignId || !email) {
      return new NextResponse(null, { status: 400 })
    }

    // Update campaign tracking
    const campaignsData = readDataFile<{ campaigns: EmailCampaign[] }>('email-campaigns.json')
    const campaigns = campaignsData.campaigns || []
    const campaign = campaigns.find(c => c.id === campaignId)

    if (campaign) {
      // Check if this email was already tracked as opened
      const trackingData = readDataFile<{ trackings: EmailTracking[] }>('email-tracking.json')
      const trackings = trackingData.trackings || []
      const existingTracking = trackings.find(
        t => t.campaignId === campaignId && t.email === email
      )

      if (!existingTracking || !existingTracking.opened) {
        // Update tracking
        if (existingTracking) {
          existingTracking.opened = true
          existingTracking.openedAt = new Date().toISOString()
        } else {
          trackings.push({
            campaignId,
            email,
            opened: true,
            openedAt: new Date().toISOString(),
            clicked: false,
            clickedAt: null,
          })
        }
        writeDataFile('email-tracking.json', { trackings })

        // Update campaign stats
        const wasNotOpened = !existingTracking || !existingTracking.opened
        if (wasNotOpened) {
          campaign.opened += 1
          campaign.notOpened = Math.max(0, campaign.notOpened - 1)
        }
        writeDataFile('email-campaigns.json', { campaigns })
      }
    }

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error tracking email open:', error)
    // Still return pixel even if tracking fails
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }
}

