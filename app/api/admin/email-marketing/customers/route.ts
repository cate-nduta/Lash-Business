import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { writeDataFile } from '@/lib/data-utils'
import {
  ManualSubscriber,
  loadManualSubscribers,
  loadSubscribers,
  loadUnsubscribes,
} from '@/lib/email-campaign-utils'

interface ImportPayload {
  subscribers: Array<{ email: string; name?: string; source?: string }>
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const subscribers = await loadSubscribers()
    const manualSubscribers = await loadManualSubscribers()
    const unsubscribes = await loadUnsubscribes()
    const unsubscribedSet = new Set(
      unsubscribes
        .filter((record) => record.unsubscribedAt)
        .map((record) => record.email.toLowerCase())
    )

    const customers = subscribers
      .map((subscriber) => ({
        email: subscriber.email,
        name: subscriber.name,
        totalBookings: subscriber.totalBookings,
        lastBookingDate: subscriber.lastBookingDate || null,
        nextBookingDate: subscriber.nextBookingDate || null,
        type: subscriber.totalBookings > 1 ? 'returning' : subscriber.totalBookings === 1 ? 'first-time' : 'imported',
        unsubscribed: unsubscribedSet.has(subscriber.email.toLowerCase()),
      }))
      .sort((a, b) => {
        const dateA = a.lastBookingDate ? new Date(a.lastBookingDate).getTime() : 0
        const dateB = b.lastBookingDate ? new Date(b.lastBookingDate).getTime() : 0
        return dateB - dateA
      })

    const manualOnly = manualSubscribers
      .filter((subscriber) => !customers.find((customer) => customer.email === subscriber.email.toLowerCase()))
      .map((subscriber) => ({
        email: subscriber.email.toLowerCase(),
        name: subscriber.name || 'Beautiful Soul',
        totalBookings: 0,
        lastBookingDate: null,
        nextBookingDate: null,
        type: 'imported',
        unsubscribed: unsubscribedSet.has(subscriber.email.toLowerCase()),
      }))

    return NextResponse.json({ customers: [...customers, ...manualOnly] })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching customers:', error)
    return NextResponse.json({ customers: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body: ImportPayload = await request.json()

    if (!body.subscribers || !Array.isArray(body.subscribers)) {
      return NextResponse.json({ error: 'Invalid subscribers payload' }, { status: 400 })
    }

    const existing = await loadManualSubscribers()
    const existingMap = new Map(existing.map((subscriber) => [subscriber.email.toLowerCase(), subscriber]))

    const now = new Date().toISOString()
    body.subscribers.forEach((subscriber) => {
      if (!subscriber.email) return
      const email = subscriber.email.toLowerCase().trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
      existingMap.set(email, {
        email,
        name: subscriber.name?.trim() || 'Beautiful Soul',
        source: subscriber.source || 'import',
        createdAt: now,
      })
    })

    const updated: ManualSubscriber[] = Array.from(existingMap.values())
    await writeDataFile('email-subscribers.json', { subscribers: updated })

    return NextResponse.json({ success: true, imported: body.subscribers.length })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error importing subscribers:', error)
    return NextResponse.json({ error: 'Failed to import subscribers' }, { status: 500 })
  }
}

