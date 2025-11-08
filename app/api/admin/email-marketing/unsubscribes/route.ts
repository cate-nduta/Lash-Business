import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface UnsubscribeRecord {
  email: string
  name?: string
  reason?: string
  token: string
  unsubscribedAt: string
}

async function loadUnsubscribes(): Promise<UnsubscribeRecord[]> {
  try {
    const data = await readDataFile<{ unsubscribes: UnsubscribeRecord[] }>('email-unsubscribes.json', {
      unsubscribes: [],
    })
    return data.unsubscribes || []
  } catch {
    return []
  }
}

async function saveUnsubscribes(records: UnsubscribeRecord[]) {
  await writeDataFile('email-unsubscribes.json', { unsubscribes: records })
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const unsubscribes = await loadUnsubscribes()
    return NextResponse.json({ unsubscribes })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading unsubscribes:', error)
    return NextResponse.json({ unsubscribes: [] }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const { action, email } = body as { action: 'resubscribe' | 'unsubscribe'; email: string }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase()
    const unsubscribes = await loadUnsubscribes()
    const index = unsubscribes.findIndex((record) => record.email.toLowerCase() === normalizedEmail)

    if (action === 'resubscribe') {
      if (index === -1) {
        return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
      }
      unsubscribes[index].unsubscribedAt = ''
      unsubscribes[index].reason = undefined
      await saveUnsubscribes(unsubscribes)
      return NextResponse.json({ success: true })
    }

    if (action === 'unsubscribe') {
      if (index === -1) {
        return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
      }
      unsubscribes[index].unsubscribedAt = new Date().toISOString()
      await saveUnsubscribes(unsubscribes)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating unsubscribe record:', error)
    return NextResponse.json({ error: 'Failed to update unsubscribe record' }, { status: 500 })
  }
}

