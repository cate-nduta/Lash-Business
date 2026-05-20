import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'

const ANALYTICS_PIN =
  process.env.ANALYTICS_PIN ||
  process.env.ADMIN_ANALYTICS_PIN ||
  process.env.ADMIN_PIN ||
  '1234'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json().catch(() => ({}))
    const pin = typeof body.pin === 'string' ? body.pin.trim() : ''

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
    }

    if (pin !== ANALYTICS_PIN) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error verifying analytics PIN:', error)
    return NextResponse.json({ error: 'Failed to verify PIN' }, { status: 500 })
  }
}
