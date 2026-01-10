import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendWaitlistNotificationEmail } from '../../email-utils'

export const dynamic = 'force-dynamic'

interface WaitlistEntry {
  email: string
  createdAt: string
  notified?: boolean
}

interface WaitlistData {
  entries: WaitlistEntry[]
}

interface WebServicesData {
  monthlyCapacity?: number
}

// POST: Send notification emails to waitlist
export async function POST(request: NextRequest) {
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

    const [waitlistData, webServicesData] = await Promise.all([
      readDataFile<WaitlistData>('labs-web-services-waitlist.json', { entries: [] }),
      readDataFile<WebServicesData>('labs-web-services.json', { monthlyCapacity: 7 }),
    ])

    const monthlyCapacity = webServicesData.monthlyCapacity || 7
    const unnotifiedEntries = waitlistData.entries.filter((entry) => !entry.notified)

    if (unnotifiedEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unnotified entries in waitlist',
        sent: 0,
      })
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Send emails to all unnotified entries
    for (const entry of unnotifiedEntries) {
      try {
        const result = await sendWaitlistNotificationEmail({
          email: entry.email,
          monthlyCapacity,
        })

        if (result.success) {
          successCount++
          // Mark as notified
          const entryIndex = waitlistData.entries.findIndex((e) => e.email === entry.email)
          if (entryIndex !== -1) {
            waitlistData.entries[entryIndex].notified = true
          }
        } else {
          errorCount++
          errors.push(`${entry.email}: ${result.error || 'Unknown error'}`)
        }
      } catch (error: any) {
        errorCount++
        errors.push(`${entry.email}: ${error.message || 'Failed to send email'}`)
      }
    }

    // Save updated waitlist data
    await writeDataFile('labs-web-services-waitlist.json', waitlistData)

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} notification email(s)`,
      sent: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Error sending waitlist notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send waitlist notifications', details: error.message },
      { status: 500 }
    )
  }
}

