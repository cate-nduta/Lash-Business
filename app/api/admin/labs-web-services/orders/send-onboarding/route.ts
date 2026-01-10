import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendOnboardingEmail } from '@/app/api/labs/web-services/email-utils'
import { generateShowcaseToken } from '@/lib/showcase-token-utils'

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
    const { orderId, emailDomain, emailPassword, websiteUrl } = body

    if (!orderId || !emailDomain || !emailPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, emailDomain, emailPassword' },
        { status: 400 }
      )
    }

    const orders = await readDataFile<any[]>('labs-web-services-orders.json', [])
    const order = orders.find((o) => o.id === orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Always regenerate showcase booking token to ensure it uses the new readable format
    // This migrates old hex tokens to the new format: {name}{date}-showcase-meeting
    const customerName = order.name || order.businessName || order.email.split('@')[0]
    const orderDate = order.createdAt || new Date().toISOString()
    order.showcaseBookingToken = generateShowcaseToken(customerName, orderDate)

    // Update order with website URL if provided
    if (websiteUrl && !order.websiteUrl) {
      order.websiteUrl = websiteUrl
    }

    const orderIndex = orders.findIndex((o) => o.id === orderId)
    if (orderIndex !== -1) {
      orders[orderIndex] = order
      await writeDataFile('labs-web-services-orders.json', orders)
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const showcaseBookingUrl = `${baseUrl}/labs/showcase-booking/${order.showcaseBookingToken}`

    // Send onboarding email
    const emailResult = await sendOnboardingEmail({
      email: order.email,
      name: order.name || order.email.split('@')[0],
      orderId: order.id,
      websiteName: order.websiteName || order.businessName || 'Your Website',
      websiteUrl: order.websiteUrl || websiteUrl || '',
      emailDomain,
      emailPassword,
      showcaseBookingUrl,
      items: order.items.map((item: any) => ({
        productName: item.productName || item.name,
        quantity: item.quantity || 1,
      })),
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send onboarding email', details: emailResult.error },
        { status: 500 }
      )
    }

    // Update order status to delivered if not already
    if (order.status !== 'delivered') {
      order.status = 'delivered'
      order.deliveredAt = new Date().toISOString()
      orders[orderIndex] = order
      await writeDataFile('labs-web-services-orders.json', orders)
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding email sent successfully',
      showcaseBookingUrl,
    })
  } catch (error: any) {
    console.error('Error sending onboarding email:', error)
    return NextResponse.json(
      { error: 'Failed to send onboarding email', details: error.message },
      { status: 500 }
    )
  }
}

