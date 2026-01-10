import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

interface Order {
  id: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
  }>
  name?: string
  email: string
  phoneNumber?: string
  businessName?: string
  domainType?: 'new' | 'existing'
  domainExtension?: string
  domainName?: string
  existingDomain?: string
  logoType?: 'upload' | 'text' | 'custom'
  logoUrl?: string
  logoText?: string
  primaryColor?: string
  secondaryColor?: string
  businessDescription?: string
  businessAddress?: string
  businessCity?: string
  businessCountry?: string
  businessHours?: Array<{
    day: string
    open: string
    close: string
    closed: boolean
  }>
  servicesProducts?: string
  socialMediaLinks?: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
    youtube?: string
    tiktok?: string
  }
  timeline?: '10' | '21' | 'urgent'
  paymentStatus: 'pending' | 'partial' | 'completed'
}

// GET: Get order data for restoration (public endpoint, but only returns order data)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const orders = await readDataFile<Order[]>('labs-web-services-orders.json', [])
    const order = orders.find((o) => o.id === orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order is already paid
    if (order.paymentStatus === 'completed') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 })
    }

    // Return order data for restoration (excluding sensitive info)
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        items: order.items.map((item) => ({
          productId: item.productId,
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
        })),
        name: order.name,
        email: order.email,
        phoneNumber: order.phoneNumber,
        businessName: order.businessName,
        domainType: order.domainType,
        domainExtension: order.domainExtension,
        domainName: order.domainName,
        existingDomain: order.existingDomain,
        logoType: order.logoType,
        logoUrl: order.logoUrl,
        logoText: order.logoText,
        primaryColor: order.primaryColor,
        secondaryColor: order.secondaryColor,
        businessDescription: order.businessDescription,
        businessAddress: order.businessAddress,
        businessCity: order.businessCity,
        businessCountry: order.businessCountry,
        businessHours: order.businessHours,
        servicesProducts: order.servicesProducts,
        socialMediaLinks: order.socialMediaLinks,
        timeline: order.timeline,
      },
    })
  } catch (error: any) {
    console.error('Error restoring order:', error)
    return NextResponse.json(
      { error: 'Failed to restore order', details: error.message },
      { status: 500 }
    )
  }
}

