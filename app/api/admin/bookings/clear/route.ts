import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    // Clear all bookings
    await writeDataFile('bookings.json', { bookings: [] })

    // Clear fully booked dates from availability.json
    const availability = await readDataFile<any>('availability.json', {})
    await writeDataFile('availability.json', {
      ...availability,
      fullyBookedDates: []
    })

    // Record activity
    await recordActivity({
      module: 'bookings',
      action: 'delete',
      performedBy,
      summary: 'Cleared all bookings and fully booked dates',
      targetId: null,
      targetType: 'system',
      details: { clearedAt: new Date().toISOString() },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'All bookings and fully booked dates have been cleared' 
    })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error clearing bookings:', error)
    return NextResponse.json({ error: 'Failed to clear bookings' }, { status: 500 })
  }
}

