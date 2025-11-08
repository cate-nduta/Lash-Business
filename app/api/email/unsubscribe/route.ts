import { NextRequest, NextResponse } from 'next/server'
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
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  const unsubscribes = await loadUnsubscribes()
  const record = unsubscribes.find((entry) => entry.token === token)

  if (!record) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  }

  return NextResponse.json({
    email: record.email,
    name: record.name,
    unsubscribedAt: record.unsubscribedAt,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token, reason, action } = body as {
    token: string
    reason?: string
    action?: 'unsubscribe' | 'resubscribe'
  }

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  const unsubscribes = await loadUnsubscribes()
  const index = unsubscribes.findIndex((entry) => entry.token === token)

  if (index === -1) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  }

  if (action === 'resubscribe') {
    unsubscribes[index].unsubscribedAt = ''
    unsubscribes[index].reason = undefined
  } else {
    unsubscribes[index].unsubscribedAt = new Date().toISOString()
    unsubscribes[index].reason = reason
  }

  await saveUnsubscribes(unsubscribes)

  return NextResponse.json({ success: true })
}

