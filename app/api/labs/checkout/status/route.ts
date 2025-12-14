import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('orderId')
    const checkoutRequestID = searchParams.get('checkoutRequestID')

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const orders = await readDataFile<any[]>('labs-orders.json', [])
    const order = orders.find(o => o.orderId === orderId)

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: order.status,
      orderId: order.orderId,
      accountCreated: order.accountCreated || false,
    })
  } catch (error: any) {
    console.error('Error checking order status:', error)
    return NextResponse.json(
      { error: 'Failed to check order status' },
      { status: 500 }
    )
  }
}

