import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'

export async function GET() {
  try {
    await requireAdminAuth()
    const promoCodes = await readDataFile('promo-codes.json', [])
    return NextResponse.json(promoCodes)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const promoCodes = await request.json()
    await writeDataFile('promo-codes.json', promoCodes)

    const count = Array.isArray((promoCodes as any)?.promoCodes)
      ? (promoCodes as any).promoCodes.length
      : Array.isArray(promoCodes)
      ? (promoCodes as any[]).length
      : undefined

    await recordActivity({
      module: 'promo_codes',
      action: 'update',
      performedBy,
      summary: `Updated promo codes${count !== undefined ? ` (${count} codes)` : ''}`,
      targetId: 'promo-codes',
      targetType: 'promo_codes',
      details: promoCodes,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save promo codes' }, { status: 500 })
  }
}

