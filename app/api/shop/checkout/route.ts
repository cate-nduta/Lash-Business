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
  pickupLocation?: string
  pickupDays?: string[]
  updatedAt?: string | null
}

const DEFAULT_PRODUCTS: ProductsPayload = { products: [], transportationFee: 150, updatedAt: null }

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

    // For M-Pesa payments, initiate STK push
    if (paymentMethod === 'mpesa') {
      if (!phoneNumber) {
        return NextResponse.json({ error: 'Phone number is required for M-Pesa payment' }, { status: 400 })
      }

      // Initiate M-Pesa STK push
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000'
      const productNames = checkoutItems.map(item => item.product.name).join(', ')
      const accountRef = isCartCheckout 
        ? `Cart-${Date.now().toString().slice(-8)}`
        : `Shop-${checkoutItems[0].product.id.slice(0, 8)}`
      const deliveryText = deliveryOption === 'lash_suite' 
        ? ' (At Lash Suite)' 
        : deliveryOption === 'pickup' 
        ? ' (Pickup)' 
        : ' (Home Delivery)'
      
      const mpesaResponse = await fetch(`${baseUrl}/api/mpesa/stk-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          amount: total,
          accountReference: accountRef,
          transactionDesc: `Purchase: ${productNames}${deliveryText}`,
        }),
      })

      const mpesaData = await mpesaResponse.json()

      if (!mpesaResponse.ok || !mpesaData.success) {
        return NextResponse.json(
          { 
            error: mpesaData.error || 'Failed to initiate M-Pesa payment',
            details: mpesaData.details 
          },
          { status: mpesaResponse.status || 500 }
        )
      }

      // Store pending purchase to track it in callback
      try {
        const shopData = await readDataFile<{ products: any[]; pendingPurchases?: any[] }>('shop-products.json', {
          products: [],
          pendingPurchases: [],
        })

        const pendingPurchases = shopData.pendingPurchases || []
        pendingPurchases.push({
          items: checkoutItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          checkoutRequestID: mpesaData.checkoutRequestID,
          phoneNumber: phoneNumber || undefined,
          email: email || undefined,
          amount: total,
          subtotal,
          deliveryOption,
          deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress : undefined,
          transportationFee: transportCost,
          createdAt: new Date().toISOString(),
        })

        await writeDataFile('shop-products.json', {
          ...shopData,
          pendingPurchases,
        })
      } catch (error) {
        console.error('Error storing pending purchase:', error)
        // Continue anyway - the callback can still work without this
      }

      return NextResponse.json({
        success: true,
        paymentMethod: 'mpesa',
        checkoutRequestID: mpesaData.checkoutRequestID,
        message: mpesaData.message || 'M-Pesa payment prompt sent. Please complete payment on your phone.',
        items: checkoutItems.map(item => ({ name: item.product.name, quantity: item.quantity })),
        subtotal,
        transportationFee: transportCost,
        total,
      })
    }

    // For card payments, you would integrate with a payment gateway here
    // For now, we'll simulate successful payment
    if (paymentMethod === 'card') {
      if (!email && !phoneNumber) {
        return NextResponse.json(
          { error: 'Email or phone number is required so we can notify you when your order is ready' },
          { status: 400 }
        )
      }
        // TODO: Integrate with actual payment gateway (e.g., Stripe, PayPal)
        // For now, we'll update quantity immediately
        // In production, you should only update after payment confirmation

        // Store order information
        const orders = data.orders || []
        const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        
        // Update product quantities
        for (const item of checkoutItems) {
          const productIndex = products.findIndex((p) => p.id === item.product.id)
          if (productIndex !== -1) {
            products[productIndex] = {
              ...products[productIndex],
              quantity: products[productIndex].quantity - item.quantity,
              updatedAt: new Date().toISOString(),
            }
          }
        }

        // Create order with all items
        const orderItems = checkoutItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        }))

        orders.push({
          id: orderId,
          items: orderItems,
          phoneNumber: phoneNumber || undefined,
          email: email || undefined,
          amount: total,
          subtotal,
          transportationFee: transportCost,
          deliveryOption,
          deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress : undefined,
          status: 'pending', // pending, ready, picked_up/delivered
          createdAt: new Date().toISOString(),
          readyForPickupAt: null,
          pickedUpAt: null,
        })

        const updatedData = {
          ...data,
          products,
          orders,
          updatedAt: new Date().toISOString(),
        }

        await writeDataFile('shop-products.json', updatedData)

        // Send confirmation email immediately with pickup information
        if (email || phoneNumber) {
          try {
            const productNames = checkoutItems.map(item => item.product.name).join(', ')
            await sendShopOrderConfirmationEmail({
              email: email || undefined,
              phoneNumber: phoneNumber || undefined,
              orderId,
              productName: productNames,
              amount: total,
              subtotal,
              transportationFee: transportCost,
              deliveryOption,
              deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress : undefined,
              pickupLocation: data.pickupLocation || 'Pick up Mtaani',
              pickupDays: data.pickupDays || ['Monday', 'Wednesday', 'Friday'],
            })
          } catch (emailError) {
            console.error('Error sending order confirmation email:', emailError)
            // Don't fail the request if email fails
          }
        }

        return NextResponse.json({
          success: true,
          paymentMethod: 'card',
          orderId,
          message: 'Payment processed successfully (simulated). You will receive an email with pickup information.',
          items: checkoutItems.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
          })),
          subtotal,
          transportationFee: transportCost,
          total,
        })
      }

    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
  } catch (error: any) {
    console.error('Error processing checkout:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process checkout' },
      { status: 500 },
    )
  }
}

