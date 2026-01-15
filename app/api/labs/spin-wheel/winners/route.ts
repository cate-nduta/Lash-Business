import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SpinWheelCode {
  id: string
  code: string
  email: string
  prizeId: string
  prizeLabel: string
  prizeType: string
  prizeValue?: number
  prizeServiceType?: string
  createdAt: string
  expiresAt: string
  used: boolean
  usedAt?: string
  usedFor?: 'consultation' | 'checkout'
  orderId?: string
  consultationId?: string
}

interface SpinWheelCodesData {
  codes: SpinWheelCode[]
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const codesData = await readDataFile<SpinWheelCodesData>('spin-wheel-codes.json', { codes: [] })

    return NextResponse.json(
      { codes: codesData.codes },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching spin wheel winners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spin wheel winners', details: error.message },
      { status: 500 }
    )
  }
}
