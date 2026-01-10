import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    const orders = await readDataFile<any[]>('labs-web-services-orders.json', [])
    // Only return orders where payment has been successfully completed (at least initial payment)
    // Filter out orders with paymentStatus 'pending' (no payment yet)
    const paidOrders = orders.filter(order => {
      // Include orders with 'partial' (initial payment done) or 'completed' (fully paid)
      return order.paymentStatus === 'partial' || order.paymentStatus === 'completed'
    })
    return NextResponse.json({ orders: paidOrders })
  } catch (error: any) {
    console.error('Error loading orders:', error)
    return NextResponse.json(
      { error: 'Failed to load orders', details: error.message },
      { status: 500 }
    )
  }
}

