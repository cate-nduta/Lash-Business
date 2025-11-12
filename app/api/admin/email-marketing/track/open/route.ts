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

    if (!campaignId || !email) {
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

      if (!existingTracking) {
        trackings.push({
          campaignId,
          email,
          opened: true,
          openedAt: new Date().toISOString(),
          clicked: false,
          clickedAt: null,
        })
        campaign.opened += 1
        campaign.notOpened = Math.max(0, campaign.totalRecipients - campaign.opened)
        await writeDataFile('email-tracking.json', { trackings })
        await writeDataFile('email-campaigns.json', { campaigns })
      } else if (!existingTracking.opened) {
        existingTracking.opened = true
        existingTracking.openedAt = new Date().toISOString()
        campaign.opened += 1
        campaign.notOpened = Math.max(0, campaign.totalRecipients - campaign.opened)
        await writeDataFile('email-tracking.json', { trackings })
        await writeDataFile('email-campaigns.json', { campaigns })
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
    console.error('Error tracking email open:', error)
    return new NextResponse(null, { status: 204 })
  }
}

