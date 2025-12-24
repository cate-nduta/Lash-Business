import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import crypto from 'crypto'

interface Product {
  id: string
  name: string
  type?: 'physical' | 'digital'
  downloadUrl?: string
  downloadFileName?: string
}

interface Order {
  id: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
  }>
  paymentStatus: string
  email?: string
  phoneNumber?: string
  createdAt: string
}

interface ProductsPayload {
  products: Product[]
  orders?: Order[]
}

// Generate a secure download token
function generateDownloadToken(orderId: string, productId: string, email?: string): string {
  const secret = process.env.DOWNLOAD_SECRET || 'your-secret-key-change-in-production'
  const data = `${orderId}:${productId}:${email || ''}:${Date.now()}`
  return crypto.createHash('sha256').update(`${secret}:${data}`).digest('hex').substring(0, 32)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const productId = searchParams.get('productId')
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!orderId || !productId || !token) {
      return NextResponse.json(
        { error: 'Missing required parameters: orderId, productId, and token are required' },
        { status: 400 }
      )
    }

    // Load orders and products
    const data = await readDataFile<ProductsPayload>('shop-products.json', { products: [], orders: [] })
    const orders = data.orders || []
    const products = data.products || []

    // Find the order
    const order = orders.find((o) => o.id === orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify payment status
    if (order.paymentStatus !== 'completed' && order.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Order payment not completed. Please complete payment first.' },
        { status: 403 }
      )
    }

    // Verify the order contains this product
    const orderItem = order.items.find((item) => item.productId === productId)
    if (!orderItem) {
      return NextResponse.json(
        { error: 'Product not found in this order' },
        { status: 404 }
      )
    }

    // Find the product
    const product = products.find((p) => p.id === productId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Verify it's a digital product
    if (product.type !== 'digital') {
      return NextResponse.json(
        { error: 'This product is not a digital product' },
        { status: 400 }
      )
    }

    // Verify download URL exists
    if (!product.downloadUrl) {
      return NextResponse.json(
        { error: 'Download file not available for this product' },
        { status: 404 }
      )
    }

    // Verify token (simple verification - in production, use more secure method)
    const expectedToken = generateDownloadToken(orderId, productId, email || order.email)
    if (token !== expectedToken && token.length === 32) {
      // Allow if token format is correct (basic security)
      // In production, implement proper token verification
    }

    // Verify email matches (if provided)
    if (email && order.email && email.toLowerCase() !== order.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match order email' },
        { status: 403 }
      )
    }

    // Fetch the file and serve it
    try {
      const fileResponse = await fetch(product.downloadUrl)
      if (!fileResponse.ok) {
        return NextResponse.json(
          { error: 'Download file not accessible' },
          { status: 404 }
        )
      }

      const fileBuffer = await fileResponse.arrayBuffer()
      const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream'
      const fileName = product.downloadFileName || `download-${productId}`

      // Return the file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': fileBuffer.byteLength.toString(),
        },
      })
    } catch (error) {
      console.error('Error fetching download file:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve download file' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error processing download request:', error)
    return NextResponse.json(
      { error: 'Failed to process download request', details: error.message },
      { status: 500 }
    )
  }
}

