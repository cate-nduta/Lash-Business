export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

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

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const data = await readDataFile<{ campaigns: EmailCampaign[] }>('email-campaigns.json', { campaigns: [] })
    return NextResponse.json({ campaigns: data.campaigns || [] })
  } catch (error: any) {
    if (error.status === 401 || error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ campaigns: [] }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminAuth()
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('id')

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    const data = await readDataFile<{ campaigns: EmailCampaign[] }>('email-campaigns.json', { campaigns: [] })
    const campaigns = data.campaigns || []
    
    const initialLength = campaigns.length
    const filteredCampaigns = campaigns.filter((campaign) => campaign.id !== campaignId)
    
    if (filteredCampaigns.length === initialLength) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    await writeDataFile('email-campaigns.json', { campaigns: filteredCampaigns })
    
    return NextResponse.json({ success: true, message: 'Campaign deleted successfully' })
  } catch (error: any) {
    if (error.status === 401 || error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting campaign:', error)
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}

