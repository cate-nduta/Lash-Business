import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const revenueData = await readDataFile<{ 
      revenue: Array<{
        id: string
        bookingId: string
        amount: number
        paymentMethod: 'cash' | 'card' | 'mpesa'
        date: string
        createdAt: string
      }>
    }>('revenue.json', { revenue: [] })

    return NextResponse.json({
      revenue: revenueData.revenue || [],
    })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching revenue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue' },
      { status: 500 }
    )
  }
}

