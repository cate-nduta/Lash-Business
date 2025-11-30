export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwnerAuth } from '@/lib/admin-auth'
import { loadRecentActivity, deleteActivityEntry } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    await requireOwnerAuth()
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit')) || 25
    const entries = await loadRecentActivity(limit)
    return NextResponse.json({ entries })
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Owner access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading activity log:', error)
    return NextResponse.json({ error: 'Failed to load activity log' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireOwnerAuth()
    const body = await request.json()
    const { entryId } = body

    if (!entryId || typeof entryId !== 'string') {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    const success = await deleteActivityEntry(entryId)
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Activity entry deleted successfully' })
    } else {
      return NextResponse.json({ error: 'Failed to delete activity entry' }, { status: 500 })
    }
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Owner access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting activity entry:', error)
    return NextResponse.json({ error: 'Failed to delete activity entry' }, { status: 500 })
  }
}


