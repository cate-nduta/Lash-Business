import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface ScheduledEmailEntry {
  id: string
  subject: string
  content: string
  recipientType: 'all' | 'first-time' | 'returning' | 'custom'
  recipients: Array<{ email: string; name: string }>
  attachments?: Array<{ name: string; url: string; type: string; size: number }>
  excludeUnsubscribed: boolean
  schedule: {
    enabled: boolean
    sendAt: string
  }
  abTest?: any
  createdAt: string
}

async function loadScheduledEmails(): Promise<ScheduledEmailEntry[]> {
  try {
    const data = await readDataFile<{ scheduled: ScheduledEmailEntry[] }>('scheduled-emails.json', {
      scheduled: [],
    })
    return data.scheduled || []
  } catch {
    return []
  }
}

async function saveScheduledEmails(entries: ScheduledEmailEntry[]) {
  await writeDataFile('scheduled-emails.json', { scheduled: entries })
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const scheduled = await loadScheduledEmails()
    return NextResponse.json({ scheduled })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading scheduled emails:', error)
    return NextResponse.json({ scheduled: [] }, { status: 200 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminAuth()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Scheduled email ID is required' }, { status: 400 })
    }

    const scheduled = (await loadScheduledEmails()).filter((entry) => entry.id !== id)
    await saveScheduledEmails(scheduled)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting scheduled email:', error)
    return NextResponse.json({ error: 'Failed to delete scheduled email' }, { status: 500 })
  }
}

