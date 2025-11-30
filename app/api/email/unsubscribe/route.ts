import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface UnsubscribeRecord {
  email: string
  name?: string
  reason?: string
  token: string
  unsubscribedAt: string
  originallyUnsubscribedAt?: string // Track when they first unsubscribed (permanent)
}

interface ManualSubscriber {
  email: string
  name?: string
  source?: string
  createdAt?: string
  promoCode?: string
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
    originallyUnsubscribedAt: record.originallyUnsubscribedAt,
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

  const record = unsubscribes[index]
  const normalizedEmail = record.email.toLowerCase().trim()

  if (action === 'resubscribe') {
    // Allow resubscription, but keep the original unsubscribed timestamp
    // so they still can't get first-time client discounts
    unsubscribes[index].unsubscribedAt = ''
    unsubscribes[index].reason = undefined
    // Keep originallyUnsubscribedAt - don't clear it! This prevents first-time discounts
    
    // Add back to subscribers database (but they won't get first-time discounts)
    try {
      const subscribersData = await readDataFile<{ subscribers: ManualSubscriber[] }>(
        'email-subscribers.json',
        { subscribers: [] }
      )
      
      // Check if already in subscribers list
      const alreadySubscribed = subscribersData.subscribers.some(
        (sub) => sub.email.toLowerCase() === normalizedEmail
      )
      
      if (!alreadySubscribed) {
        // Add back to subscribers
        subscribersData.subscribers.push({
          email: normalizedEmail,
          name: record.name,
          source: 'resubscribe',
          createdAt: new Date().toISOString(),
        })
        
        await writeDataFile('email-subscribers.json', subscribersData)
      }
    } catch (error) {
      console.error('Error adding subscriber back to database:', error)
      // Continue even if addition fails
    }
  } else {
    // Unsubscribe action
    const unsubscribeTimestamp = new Date().toISOString()
    unsubscribes[index].unsubscribedAt = unsubscribeTimestamp
    unsubscribes[index].reason = reason
    
    // Mark the original unsubscribe timestamp if this is their first time unsubscribing
    if (!unsubscribes[index].originallyUnsubscribedAt) {
      unsubscribes[index].originallyUnsubscribedAt = unsubscribeTimestamp
    }

    // Remove email from active subscribers database
    try {
      const subscribersData = await readDataFile<{ subscribers: ManualSubscriber[] }>(
        'email-subscribers.json',
        { subscribers: [] }
      )
      
      // Remove from subscribers list
      subscribersData.subscribers = subscribersData.subscribers.filter(
        (sub) => sub.email.toLowerCase() !== normalizedEmail
      )
      
      await writeDataFile('email-subscribers.json', subscribersData)
    } catch (error) {
      console.error('Error removing subscriber from database:', error)
      // Continue even if removal fails
    }
  }

  await saveUnsubscribes(unsubscribes)

  return NextResponse.json({ success: true })
}

