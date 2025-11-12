import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { normalizePromoCatalog } from '@/lib/promo-utils'

export async function GET() {
  try {
    await requireAdminAuth()
    const raw = await readDataFile('promo-codes.json', {})
    const { catalog, changed, count } = normalizePromoCatalog(raw)

    if (changed) {
      await writeDataFile('promo-codes.json', catalog)
    }

    return NextResponse.json({ promoCodes: catalog.promoCodes, count })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading promo codes:', error)
    return NextResponse.json({ error: 'Failed to load promo codes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const payload = await request.json()
    const { catalog, count } = normalizePromoCatalog(payload)

    await writeDataFile('promo-codes.json', catalog)

    await recordActivity({
      module: 'promo_codes',
      action: 'update',
      performedBy,
      summary: `Updated promo codes (${count} codes)`,
      targetId: 'promo-codes',
      targetType: 'promo_codes',
      details: catalog,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving promo codes:', error)
    return NextResponse.json({ error: 'Failed to save promo codes' }, { status: 500 })
  }
}
