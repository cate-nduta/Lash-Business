export const dynamic = 'force-dynamic'

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

    const campaignsData = await readDataFile<{ campaigns: EmailCampaign[] }>('email-campaigns.json', {
      campaigns: [],
    })
    const campaigns = campaignsData.campaigns || []
    const campaign = campaigns.find((c) => c.id === campaignId)

    if (campaign) {
      const trackingData = await readDataFile<{ trackings: EmailTracking[] }>('email-tracking.json', {
        trackings: [],
      })
      const trackings = trackingData.trackings || []
      const existingTracking = trackings.find(
        (t) => t.campaignId === campaignId && t.email === email
      )

      if (!existingTracking || !existingTracking.clicked) {
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
        await writeDataFile('email-tracking.json', { trackings })

        const wasNotClicked = !existingTracking || !existingTracking.clicked
        if (wasNotClicked) {
          campaign.clicked += 1
        }
        await writeDataFile('email-campaigns.json', { campaigns })
      }
    }

    return NextResponse.redirect(new URL(url, request.url))
  } catch (error) {
    console.error('Error tracking email click:', error)
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

