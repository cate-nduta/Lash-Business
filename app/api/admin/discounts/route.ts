import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'

export const revalidate = 0

export async function GET() {
  try {
    await requireAdminAuth()
    const discounts = await readDataFile('discounts.json', {})
    return NextResponse.json(discounts)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const discounts = await request.json()
    await writeDataFile('discounts.json', discounts)

    await recordActivity({
      module: 'discounts',
      action: 'update',
      performedBy,
      summary: 'Updated discount settings',
      targetId: 'discount-settings',
      targetType: 'discounts',
      details: discounts,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save discounts' }, { status: 500 })
  }
}

