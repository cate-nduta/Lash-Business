import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendShopOrderConfirmationEmail } from '@/app/api/shop/email/utils'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  quantity: number
  imageUrl?: string
  createdAt?: string
  updatedAt?: string
  type?: 'physical' | 'digital'
  downloadUrl?: string
  downloadFileName?: string
  category?: string
}

interface ProductsPayload {
  products: Product[]
  orders?: any[]
  pendingPurchases?: any[]
  transportationFee?: number
  shopNotice?: string
  pickupLocation?: string
  pickupDays?: string[]
  updatedAt?: string | null
}

const DEFAULT_PRODUCTS: ProductsPayload = {
  products: [],
  orders: [],
  pendingPurchases: [],
  transportationFee: 150,
  shopNotice: '',
  pickupLocation: 'Pick up Mtaani',
  pickupDays: ['Monday', 'Wednesday', 'Friday'],
  updatedAt: null,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, items, phoneNumber, email, deliveryAddress } = body
    let { deliveryOption } = body

    // Support both single product and cart checkout
    const isCartCheckout = Array.isArray(items) && items.length > 0
    const isSingleProduct = productId && typeof productId === 'string'

    if (!isCartCheckout && !isSingleProduct) {
      return NextResponse.json({ error: 'Either productId or items array is required' }, { status: 400 })
    }

    // Payment method will be selected on Paystack page - no need to validate here
    // Paystack handles all payment methods (card, M-Pesa, etc.)

    const data = await readDataFile<ProductsPayload>('shop-products.json', DEFAULT_PRODUCTS)
    const products = data.products || []
    const transportationFee = typeof data.transportationFee === 'number' && data.transportationFee >= 0 
      ? data.transportationFee 
      : 150
    const pickupLocation = typeof data.pickupLocation === 'string' && data.pickupLocation.trim().length > 0
      ? data.pickupLocation.trim()
      : 'Pick up Mtaani'
    const pickupDays = Array.isArray(data.pickupDays) && data.pickupDays.length > 0
      ? data.pickupDays
      : ['Monday', 'Wednesday', 'Friday']

    let checkoutItems: Array<{ product: Product; quantity: number }> = []
    let subtotal = 0
    let hasDigitalProducts = false
    let hasPhysicalProducts = false

    if (isCartCheckout) {
      // Process cart items
      for (const item of items) {
        if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
          return NextResponse.json({ error: 'Invalid cart item' }, { status: 400 })
        }

        const productIndex = products.findIndex((p) => p.id === item.productId)
        if (productIndex === -1) {
          return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 })
        }

        const product = products[productIndex]
        if (product.type === 'digital') {
          hasDigitalProducts = true
        } else {
          hasPhysicalProducts = true
        }
        
        if (product.quantity < item.quantity && product.type !== 'digital') {
          return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 })
        }

        checkoutItems.push({ product, quantity: item.quantity })
        subtotal += product.price * item.quantity
      }
    } else {
      // Single product checkout (backward compatibility)
      const productIndex = products.findIndex((p) => p.id === productId)
      if (productIndex === -1) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      const product = products[productIndex]
      if (product.type === 'digital') {
        hasDigitalProducts = true
      } else {
        hasPhysicalProducts = true
        if (product.quantity <= 0) {
          return NextResponse.json({ error: 'Product is out of stock' }, { status: 400 })
        }
      }
      checkoutItems.push({ product, quantity: 1 })
      subtotal = product.price
    }

    // Validate delivery option (only required for physical products)
    if (hasPhysicalProducts) {
      if (!deliveryOption || !['pickup', 'delivery', 'lash_suite'].includes(deliveryOption)) {
        return NextResponse.json({ error: 'Invalid delivery option. Must be "pickup", "delivery", or "lash_suite"' }, { status: 400 })
      }

      if (deliveryOption === 'delivery' && (!deliveryAddress || !deliveryAddress.trim())) {
        return NextResponse.json({ error: 'Delivery address is required for home delivery' }, { status: 400 })
      }
    } else {
      // Digital products don't need delivery option
      deliveryOption = 'digital' as any
    }

    // Calculate transport cost (only for physical products)
    const transportCost = hasPhysicalProducts
      ? (deliveryOption === 'lash_suite' ? 0 : deliveryOption === 'pickup' ? transportationFee : 0)
      : 0
    const total = subtotal + transportCost

    // Email is required for Paystack payment processing
    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required for payment processing.' },
        { status: 400 },
      )
    }

    // Paystack handles all payment methods (card, M-Pesa, etc.)
    const orderItems = checkoutItems.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }))

    // Create order first (will be updated after payment)
    const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const now = new Date().toISOString()
    const orders = Array.isArray(data.orders) ? data.orders : []
    
    // Prepare customer name for PesaPal
    const customerName = email ? email.split('@')[0] : phoneNumber || 'Customer'
    const nameParts = customerName.split(' ')
    const firstName = nameParts[0] || 'Customer'
    const lastName = nameParts.slice(1).join(' ') || firstName

    // Create temporary order record (will be confirmed after payment)
    const order = {
      id: orderId,
      items: orderItems,
      paymentMethod: 'paystack', // Paystack handles all payment methods
      paymentStatus: 'pending',
      phoneNumber: phoneNumber || undefined,
      email: email || undefined,
      amount: total,
      subtotal,
      transportationFee: transportCost,
      deliveryOption,
      deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress : undefined,
      status: 'pending_payment',
      createdAt: now,
      readyForPickupAt: null,
      pickedUpAt: null,
      paymentOrderTrackingId: null, // Will be set after Paystack payment initialization
    }

    orders.unshift(order)

    // Save order temporarily (will be updated after payment confirmation)
    await writeDataFile('shop-products.json', {
      ...data,
      orders,
      updatedAt: now,
    })

    // Return order info - frontend will initialize Paystack payment
    return NextResponse.json({
      success: true,
      orderId,
      paymentMethod: 'paystack',
      message: 'Order created. Proceed to payment.',
      items: orderItems.map((item) => ({ name: item.productName, quantity: item.quantity })),
      subtotal,
      transportationFee: transportCost,
      total,
      amount: total,
      customerName: `${firstName} ${lastName}`.trim() || 'Customer',
      customerEmail: email || undefined,
      customerPhone: phoneNumber || undefined,
    })
  } catch (error: any) {
    console.error('Error processing checkout:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process checkout' },
      { status: 500 },
    )
  }
}

