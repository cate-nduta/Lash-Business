import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
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

