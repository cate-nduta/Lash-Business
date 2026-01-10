import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const orderId = params.id
    const body = await request.json()
    const { status } = body

    if (!status || !['pending', 'in_progress', 'completed', 'delivered'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const orders = await readDataFile<any[]>('labs-web-services-orders.json', [])
    const order = orders.find((o) => o.id === orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    order.status = status

    const orderIndex = orders.findIndex((o) => o.id === orderId)
    if (orderIndex !== -1) {
      orders[orderIndex] = order
      await writeDataFile('labs-web-services-orders.json', orders)
    }

    return NextResponse.json({
      success: true,
      message: 'Order status updated',
    })
  } catch (error: any) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'Failed to update order status', details: error.message },
      { status: 500 }
    )
  }
}

