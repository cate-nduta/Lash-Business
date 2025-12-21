import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

// This endpoint receives callbacks from Pesapal after payment processing
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderTrackingId = searchParams.get('OrderTrackingId')
    const orderMerchantReference = searchParams.get('OrderMerchantReference')

    if (!orderTrackingId) {
      return NextResponse.redirect(new URL('/booking?payment=error&message=Missing order tracking ID', request.url))
    }

    // Determine if this is a booking or shop order
    let isShopOrder = false
    try {
      const shopData = await readDataFile<any>('shop-products.json', { orders: [] })
      const shopOrder = shopData.orders?.find((o: any) => o.pesapalOrderTrackingId === orderTrackingId)
      if (shopOrder) {
        isShopOrder = true
      }
    } catch (error) {
      // Ignore errors, will default to booking
    }

    if (isShopOrder) {
      // Redirect to cart/shop page with payment status
      return NextResponse.redirect(
        new URL(`/cart?payment=success&orderTrackingId=${orderTrackingId}`, request.url)
      )
    } else {
      // Redirect to booking page with payment status
      // The actual payment verification will be done via IPN
      return NextResponse.redirect(
        new URL(`/booking?payment=processing&orderTrackingId=${orderTrackingId}`, request.url)
      )
    }
  } catch (error: any) {
    console.error('Error processing Pesapal callback:', error)
    return NextResponse.redirect(new URL('/booking?payment=error', request.url))
  }
}

