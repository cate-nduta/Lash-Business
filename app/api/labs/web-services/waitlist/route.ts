import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

interface WaitlistEntry {
  email: string
  createdAt: string
  notified?: boolean // Whether they've been notified that capacity opened
}

interface WaitlistData {
  entries: WaitlistEntry[]
}

const DEFAULT_DATA: WaitlistData = {
  entries: [],
}

// POST: Add email to waitlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const data = await readDataFile<WaitlistData>('labs-web-services-waitlist.json', DEFAULT_DATA)

    // Check if email already exists
    const existingEntry = data.entries.find((entry) => entry.email.toLowerCase() === normalizedEmail)
    if (existingEntry) {
      return NextResponse.json({
        success: true,
        message: 'Email already on waitlist',
        alreadyExists: true,
      })
    }

    // Add new entry
    const newEntry: WaitlistEntry = {
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
      notified: false,
    }

    data.entries.push(newEntry)
    await writeDataFile('labs-web-services-waitlist.json', data)

    return NextResponse.json({
      success: true,
      message: 'Email added to waitlist',
    })
  } catch (error: any) {
    console.error('Error adding to waitlist:', error)
    return NextResponse.json(
      { error: 'Failed to add to waitlist', details: error.message },
      { status: 500 }
    )
  }
}

// GET: Get waitlist (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResponse = await fetch(new URL('/api/admin/current-user', request.url), {
      headers: {
        Cookie: request.headers.get('Cookie') || '',
      },
    })

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authData = await authResponse.json()
    if (!authData.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await readDataFile<WaitlistData>('labs-web-services-waitlist.json', DEFAULT_DATA)
    
    // Sort by creation date (newest first)
    const sortedEntries = [...data.entries].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({
      success: true,
      entries: sortedEntries,
      total: sortedEntries.length,
    })
  } catch (error: any) {
    console.error('Error fetching waitlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waitlist', details: error.message },
      { status: 500 }
    )
  }
}

