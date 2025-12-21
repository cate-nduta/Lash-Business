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
    const { productId, items, paymentMethod, phoneNumber, email, deliveryOption, deliveryAddress } = body

    // Support both single product and cart checkout
    const isCartCheckout = Array.isArray(items) && items.length > 0
    const isSingleProduct = productId && typeof productId === 'string'

    if (!isCartCheckout && !isSingleProduct) {
      return NextResponse.json({ error: 'Either productId or items array is required' }, { status: 400 })
    }

    if (!paymentMethod || !['mpesa', 'card'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Valid payment method is required (mpesa or card)' }, { status: 400 })
    }

    // Validate delivery option
    if (!deliveryOption || !['pickup', 'delivery', 'lash_suite'].includes(deliveryOption)) {
      return NextResponse.json({ error: 'Invalid delivery option. Must be "pickup", "delivery", or "lash_suite"' }, { status: 400 })
    }

    if (deliveryOption === 'delivery' && (!deliveryAddress || !deliveryAddress.trim())) {
      return NextResponse.json({ error: 'Delivery address is required for home delivery' }, { status: 400 })
    }

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
        if (product.quantity < item.quantity) {
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
      if (product.quantity <= 0) {
        return NextResponse.json({ error: 'Product is out of stock' }, { status: 400 })
      }
      checkoutItems.push({ product, quantity: 1 })
      subtotal = product.price
    }

    const transportCost = deliveryOption === 'lash_suite' ? 0 : deliveryOption === 'pickup' ? transportationFee : 0
    const total = subtotal + transportCost

    // Validate contact info
    if (!email && !phoneNumber) {
      return NextResponse.json(
        { error: 'Email or phone number is required so we can confirm your order.' },
        { status: 400 },
      )
    }

    // For both M-Pesa and card, use PesaPal
    // PesaPal supports both payment methods
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
      paymentMethod: 'pesapal', // Both M-Pesa and card go through PesaPal
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
      pesapalOrderTrackingId: null, // Will be set after PesaPal order submission
    }

    orders.unshift(order)

    // Save order temporarily (will be updated after payment confirmation)
    await writeDataFile('shop-products.json', {
      ...data,
      orders,
      updatedAt: now,
    })

    // Submit order to PesaPal (import the function directly)
    try {
      // Import PesaPal submit order logic
      const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || ''
      const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || ''
      const PESAPAL_ENVIRONMENT = process.env.PESAPAL_ENVIRONMENT || 'sandbox'
      
      // Check if Pesapal is configured
      if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
        throw new Error('Pesapal API credentials not configured. Please add PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET to your environment variables.')
      }
      
      const getBaseUrl = (): string => {
        const raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || ''
        if (typeof raw === 'string' && raw.trim().length > 0) {
          const trimmed = raw.trim().replace(/\/+$/, '')
          if (/^https?:\/\//i.test(trimmed)) {
            return trimmed
          }
          return `https://${trimmed}`
        }
        return 'https://lashdiary.co.ke'
      }
      
      const PESAPAL_CALLBACK_URL = process.env.PESAPAL_CALLBACK_URL || `${getBaseUrl()}/api/pesapal/callback`
      const PESAPAL_IPN_URL = process.env.PESAPAL_IPN_URL || `${getBaseUrl()}/api/pesapal/ipn`
      const PESAPAL_BASE_URL = PESAPAL_ENVIRONMENT === 'live'
        ? 'https://pay.pesapal.com/v3'
        : 'https://cybqa.pesapal.com/pesapalv3'

      // Get access token
      const auth = Buffer.from(`${PESAPAL_CONSUMER_KEY}:${PESAPAL_CONSUMER_SECRET}`).toString('base64')
      const tokenResponse = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth}`,
        },
        body: JSON.stringify({}),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get PesaPal access token')
      }

      const tokenData = await tokenResponse.json()
      const accessToken = tokenData.token

      // Generate order tracking ID
      const orderTrackingId = `LashDiary-Shop-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      // Prepare order data
      const pesapalOrderData = {
        id: orderTrackingId,
        currency: 'KES',
        amount: Math.round(total),
        description: `LashDiary Shop Order - ${orderItems.map((item) => item.productName).join(', ')}`,
        callback_url: PESAPAL_CALLBACK_URL,
        notification_id: PESAPAL_IPN_URL,
        billing_address: {
          email_address: email || undefined,
          phone_number: phoneNumber || null,
          country_code: 'KE',
          first_name: firstName,
          middle_name: '',
          last_name: lastName,
          line_1: '',
          line_2: '',
          city: '',
          postal_code: '',
          zip_code: '',
        },
      }

      // Submit order to PesaPal
      const pesapalResponse = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(pesapalOrderData),
      })

      const pesapalData = await pesapalResponse.json()

      if (pesapalResponse.ok && pesapalData.redirect_url) {
        // Update order with PesaPal tracking ID
        const updatedOrders = orders.map((o: any) => 
          o.id === orderId 
            ? { ...o, pesapalOrderTrackingId: pesapalData.order_tracking_id || orderTrackingId }
            : o
        )
        
        await writeDataFile('shop-products.json', {
          ...data,
          orders: updatedOrders,
          updatedAt: now,
        })

        return NextResponse.json({
          success: true,
          orderId,
          paymentMethod: 'pesapal',
          redirectUrl: pesapalData.redirect_url,
          orderTrackingId: pesapalData.order_tracking_id || orderTrackingId,
          message: 'Redirecting to secure payment page...',
          items: orderItems.map((item) => ({ name: item.productName, quantity: item.quantity })),
          subtotal,
          transportationFee: transportCost,
          total,
        })
      } else {
        console.error('PesaPal Submit Order Error:', pesapalData)
        // If PesaPal fails, still create order but mark as pending manual payment
        return NextResponse.json({
          success: true,
          orderId,
          paymentMethod: 'pesapal',
          message: pesapalData.message || pesapalData.error || 'Payment gateway temporarily unavailable. We will contact you with payment instructions.',
          items: orderItems.map((item) => ({ name: item.productName, quantity: item.quantity })),
          subtotal,
          transportationFee: transportCost,
          total,
        })
      }
    } catch (pesapalError: any) {
      console.error('Error submitting to PesaPal:', pesapalError)
      // If PesaPal fails, still create order but mark as pending manual payment
      return NextResponse.json({
        success: true,
        orderId,
        paymentMethod: 'pesapal',
        message: 'Payment gateway temporarily unavailable. We will contact you with payment instructions.',
        items: orderItems.map((item) => ({ name: item.productName, quantity: item.quantity })),
        subtotal,
        transportationFee: transportCost,
        total,
      })
    }
  } catch (error: any) {
    console.error('Error processing checkout:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process checkout' },
      { status: 500 },
    )
  }
}

