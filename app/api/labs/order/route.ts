import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('orderId')

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

    // Load tier information
    const labsSettings = await readDataFile<any>('labs-settings.json', { tiers: [] })
    const tier = labsSettings.tiers?.find((t: any) => t.id === order.tierId)

    return NextResponse.json({
      order,
      tier,
    })
  } catch (error: any) {
    console.error('Error loading order:', error)
    return NextResponse.json(
      { error: 'Failed to load order' },
      { status: 500 }
    )
  }
}

