import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendShopOrderReadyEmail } from '@/app/api/shop/email/utils'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const { orderId } = body

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
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

    if (order.status === 'ready' || order.status === 'to_be_dropped' || order.status === 'dropped') {
      return NextResponse.json({ error: 'Order is already processed' }, { status: 400 })
    }

    // Update order status
    orders[orderIndex] = {
      ...order,
      status: 'ready',
      readyForPickupAt: order.readyForPickupAt || new Date().toISOString(),
    }

    // Save updated data
    await writeDataFile('shop-products.json', {
      ...data,
      orders,
      updatedAt: new Date().toISOString(),
    })

    // Send email notification if email is available
    if (order.email) {
      try {
        await sendShopOrderReadyEmail({
          email: order.email,
          orderId: order.id,
          productName: order.productName,
          pickupLocation: data.pickupLocation || 'Pick up Mtaani',
          pickupDays: data.pickupDays || ['Monday', 'Wednesday', 'Friday'],
        })
      } catch (emailError) {
        console.error('Error sending order ready email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      order: orders[orderIndex],
      message: order.email
        ? 'Order marked as ready and customer notified via email'
        : 'Order marked as ready (no email to send)',
    })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error marking order as ready:', error)
    return NextResponse.json({ error: 'Failed to mark order as ready' }, { status: 500 })
  }
}

