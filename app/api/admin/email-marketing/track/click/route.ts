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
    const url = searchParams.get('url')

    if (!campaignId || !email || !url) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Update campaign tracking
    const campaignsData = readDataFile<{ campaigns: EmailCampaign[] }>('email-campaigns.json')
    const campaigns = campaignsData.campaigns || []
    const campaign = campaigns.find(c => c.id === campaignId)

    if (campaign) {
      // Check if this email was already tracked as clicked
      const trackingData = readDataFile<{ trackings: EmailTracking[] }>('email-tracking.json')
      const trackings = trackingData.trackings || []
      const existingTracking = trackings.find(
        t => t.campaignId === campaignId && t.email === email
      )

      if (!existingTracking || !existingTracking.clicked) {
        // Update tracking
        if (existingTracking) {
          existingTracking.clicked = true
          existingTracking.clickedAt = new Date().toISOString()
        } else {
          trackings.push({
            campaignId,
            email,
            opened: false,
            openedAt: null,
            clicked: true,
            clickedAt: new Date().toISOString(),
          })
        }
        writeDataFile('email-tracking.json', { trackings })

        // Update campaign stats
        const wasNotClicked = !existingTracking || !existingTracking.clicked
        if (wasNotClicked) {
          campaign.clicked += 1
        }
        writeDataFile('email-campaigns.json', { campaigns })
      }
    }

    // Redirect to the original URL
    return NextResponse.redirect(new URL(url, request.url))
  } catch (error) {
    console.error('Error tracking email click:', error)
    // Try to redirect anyway
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

