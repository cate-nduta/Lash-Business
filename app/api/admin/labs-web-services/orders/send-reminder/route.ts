import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { sendCheckoutReminderEmail } from '@/app/api/labs/web-services/email-utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Load order
    const orders = await readDataFile<any[]>('labs-web-services-orders.json', [])
    const order = orders.find((o) => o.id === orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order is already paid
    if (order.paymentStatus === 'completed') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 })
    }

    // Generate checkout link with orderId to restore their cart
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'
    const checkoutLink = `${baseUrl}/labs/custom-website-builds/checkout?orderId=${order.id}`

    // Send reminder email
    const emailResult = await sendCheckoutReminderEmail({
      recipientEmail: order.email,
      recipientName: order.name || order.email.split('@')[0],
      orderId: order.id,
      items: order.items.map((item: any) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: order.total,
      checkoutLink: checkoutLink,
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: emailResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder email sent successfully',
    })
  } catch (error: any) {
    console.error('Error sending reminder email:', error)
    return NextResponse.json(
      { error: 'Failed to send reminder email', details: error.message },
      { status: 500 }
    )
  }
}

