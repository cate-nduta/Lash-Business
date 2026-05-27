import { NextRequest, NextResponse } from 'next/server'
import { readDataFilePreferRemote, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { loadPolicies } from '@/lib/policies-utils'
import { normalizeDepositNotice } from '@/lib/deposit-notice-utils'

export const revalidate = 0

export async function GET() {
  try {
    await requireAdminAuth()
    const discounts = await readDataFilePreferRemote('discounts.json', {})
    return NextResponse.json({
      ...discounts,
      depositNotice: normalizeDepositNotice((discounts as any)?.depositNotice),
    })
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
    const normalizedDiscounts = {
      ...discounts,
      depositNotice: normalizeDepositNotice(discounts?.depositNotice),
    }
    await writeDataFile('discounts.json', normalizedDiscounts)

    try {
      await loadPolicies()
    } catch (error) {
      console.warn('Failed to refresh policies after discount update:', error)
    }

    await recordActivity({
      module: 'discounts',
      action: 'update',
      performedBy,
      summary: 'Updated discount settings',
      targetId: 'discount-settings',
      targetType: 'discounts',
      details: normalizedDiscounts,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save discounts' }, { status: 500 })
  }
}

