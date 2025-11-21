import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

const VALID_STATUSES = ['pending', 'ready', 'to_be_dropped', 'dropped', 'picked_up', 'delivered']

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const { orderId, status } = body

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const data = await readDataFile<any>('shop-products.json', {
      products: [],
      orders: [],
      transportationFee: 150,
      pickupLocation: 'Pick up Mtaani',
      pickupDays: ['Monday', 'Wednesday', 'Friday'],
    })

    const orders = data.orders || []
    const orderIndex = orders.findIndex((o: any) => o.id === orderId)

    if (orderIndex === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = orders[orderIndex]

    // Update order status
    const updatedOrder = {
      ...order,
      status,
    }

    // Add timestamps for certain status changes
    if (status === 'ready' && !order.readyForPickupAt) {
      updatedOrder.readyForPickupAt = new Date().toISOString()
    }
    if (status === 'dropped' && !order.droppedAt) {
      updatedOrder.droppedAt = new Date().toISOString()
    }
    if (status === 'picked_up' && !order.pickedUpAt) {
      updatedOrder.pickedUpAt = new Date().toISOString()
    }
    if (status === 'delivered' && !order.deliveredAt) {
      updatedOrder.deliveredAt = new Date().toISOString()
    }

    orders[orderIndex] = updatedOrder

    // Save updated data
    await writeDataFile('shop-products.json', {
      ...data,
      orders,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order status updated to "${status}"`,
    })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating order status:', error)
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }
}

