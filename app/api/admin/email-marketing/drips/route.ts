import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface DripEmail {
  dayOffset: number
  subject: string
  content: string
}

interface DripCampaign {
  id: string
  name: string
  enabled: boolean
  trigger: string
  emails: DripEmail[]
}

async function loadDripCampaigns(): Promise<DripCampaign[]> {
  try {
    const data = await readDataFile<{ campaigns: DripCampaign[] }>('drip-campaigns.json', {
      campaigns: [],
    })
    return data.campaigns || []
  } catch {
    return []
  }
}

async function saveDripCampaigns(campaigns: DripCampaign[]) {
  await writeDataFile('drip-campaigns.json', { campaigns })
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const campaigns = await loadDripCampaigns()
    return NextResponse.json({ campaigns })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading drip campaigns:', error)
    return NextResponse.json({ campaigns: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const { campaigns } = body as { campaigns: DripCampaign[] }

    if (!Array.isArray(campaigns)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    await saveDripCampaigns(campaigns)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating drip campaigns:', error)
    return NextResponse.json({ error: 'Failed to update drip campaigns' }, { status: 500 })
  }
}
