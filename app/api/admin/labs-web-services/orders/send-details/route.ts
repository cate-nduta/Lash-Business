import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendWebsiteDeliveryEmail } from '@/app/api/labs/web-services/email-utils'

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
    const { orderId, websiteName, websiteUrl, meetingLink } = body

    if (!orderId || !websiteName || !websiteUrl || !meetingLink) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, websiteName, websiteUrl, meetingLink' },
        { status: 400 }
      )
    }

    const orders = await readDataFile<any[]>('labs-web-services-orders.json', [])
    const order = orders.find((o) => o.id === orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order with website details
    order.websiteName = websiteName
    order.websiteUrl = websiteUrl
    order.meetingLink = meetingLink
    order.status = 'delivered'

    const orderIndex = orders.findIndex((o) => o.id === orderId)
    if (orderIndex !== -1) {
      orders[orderIndex] = order
      await writeDataFile('labs-web-services-orders.json', orders)
    }

    // Generate referral code if order is fully paid and delivered
    if (order.paymentStatus === 'completed' && order.remainingPayment === 0) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const generateResponse = await fetch(new URL('/api/labs/referrals/generate', baseUrl), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`,
          },
          body: JSON.stringify({
            orderId: order.id,
            email: order.email,
            orderTotal: order.total,
            businessName: order.businessName || order.email.split('@')[0],
          }),
        })
        if (generateResponse.ok) {
          console.log('Referral code generated for delivered order:', order.id)
        }
      } catch (error) {
        console.error('Error generating referral code:', error)
      }
    }

    // Send email
    const emailResult = await sendWebsiteDeliveryEmail({
      email: order.email,
      name: order.email.split('@')[0],
      orderId: order.id,
      websiteName,
      websiteUrl,
      meetingLink,
      items: order.items.map((item: any) => ({
        productName: item.productName,
        quantity: item.quantity,
      })),
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: emailResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Website details sent successfully',
    })
  } catch (error: any) {
    console.error('Error sending website details:', error)
    return NextResponse.json(
      { error: 'Failed to send website details', details: error.message },
      { status: 500 }
    )
  }
}

