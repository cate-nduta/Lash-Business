import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendShopOrderConfirmationEmail } from '@/app/api/shop/email/utils'

// This endpoint receives callbacks from M-Pesa after payment processing
export async function POST(request: NextRequest) {
  try {
    // Safety check: If M-Pesa is not configured, just acknowledge the callback
    const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || ''
    if (!MPESA_CONSUMER_KEY) {
      console.log('M-Pesa callback received but M-Pesa is not configured. Acknowledging callback.')
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Callback received' })
    }
    
    const body = await request.json()
    
    // Log the callback for debugging
    console.log('M-Pesa Callback Received:', JSON.stringify(body, null, 2))

    // Extract payment details from M-Pesa callback
    const resultCode = body.Body?.stkCallback?.ResultCode
    const resultDesc = body.Body?.stkCallback?.ResultDesc
    const checkoutRequestID = body.Body?.stkCallback?.CheckoutRequestID
    const callbackMetadata = body.Body?.stkCallback?.CallbackMetadata?.Item || []

    // Extract payment details
    let amount = null
    let mpesaReceiptNumber = null
    let transactionDate = null
    let phoneNumber = null

    callbackMetadata.forEach((item: any) => {
      if (item.Name === 'Amount') amount = item.Value
      if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value
      if (item.Name === 'TransactionDate') transactionDate = item.Value
      if (item.Name === 'PhoneNumber') phoneNumber = item.Value
    })

    // Process successful payment
    if (resultCode === 0) {
      console.log('✅ M-Pesa Payment Successful:', {
        checkoutRequestID,
        amount,
        mpesaReceiptNumber,
        transactionDate,
        phoneNumber,
      })

      // Convert amount from cents to KSH (M-Pesa sends amount in cents)
      const amountInKSH = amount ? amount / 100 : 0

      // Try to find and update shop purchase first (check pending purchases by checkoutRequestID)
      let shopPurchaseHandled = false
      try {
        const shopData = await readDataFile<{ 
          products: any[]; 
          pendingPurchases?: any[]; 
          orders?: any[]; 
          transportationFee?: number;
          pickupLocation?: string;
          pickupDays?: string[];
        }>('shop-products.json', {
          products: [],
          pendingPurchases: [],
          orders: [],
          transportationFee: 150,
          pickupLocation: 'Pick up Mtaani',
          pickupDays: ['Monday', 'Wednesday', 'Friday'],
        })
        
        // Check if this checkoutRequestID matches a pending shop purchase
        const pendingPurchases = shopData.pendingPurchases || []
        const purchaseIndex = pendingPurchases.findIndex(
          (p: any) => p.checkoutRequestID === checkoutRequestID
        )

        if (purchaseIndex !== -1) {
          const purchase = pendingPurchases[purchaseIndex]
          const products = shopData.products || []
          const orders = shopData.orders || []
          const orderItems: Array<{
            productId: string
            productName: string
            quantity: number
            price: number
          }> = []

          const reduceProductQuantity = (productId: string, quantity: number) => {
            const productIndex = products.findIndex((p: any) => p.id === productId)
            if (productIndex === -1) {
              console.warn(`⚠️ Product ${productId} not found while completing M-Pesa checkout`)
              return
            }

            const product = products[productIndex]
            if (product.quantity <= 0) {
              console.warn(`⚠️ Product ${productId} has no stock left while processing M-Pesa payment`)
              return
            }

            const qtyToDeduct = Math.min(Math.max(quantity, 1), product.quantity)
            products[productIndex] = {
              ...product,
              quantity: product.quantity - qtyToDeduct,
              updatedAt: new Date().toISOString(),
            }

            orderItems.push({
              productId: product.id,
              productName: product.name,
              quantity: qtyToDeduct,
              price: product.price,
            })
          }

          if (Array.isArray(purchase.items) && purchase.items.length > 0) {
            for (const item of purchase.items) {
              if (!item?.productId) continue
              reduceProductQuantity(item.productId, item.quantity || 1)
            }
          } else if (purchase.productId) {
            // Backwards compatibility for legacy single-product purchases
            reduceProductQuantity(purchase.productId, purchase.quantity || 1)
          }

          if (orderItems.length > 0) {
            const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
            const transportationFee =
              typeof purchase.transportationFee === 'number'
                ? purchase.transportationFee
                : shopData.transportationFee || 150
            const purchaseDeliveryOption = purchase.deliveryOption || 'pickup'
            const subtotal =
              typeof purchase.subtotal === 'number'
                ? purchase.subtotal
                : orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

            orders.push({
              id: orderId,
              items: orderItems,
              phoneNumber: purchase.phoneNumber || undefined,
              email: purchase.email || undefined,
              amount: purchase.amount || subtotal + transportationFee,
              subtotal,
              transportationFee,
              deliveryOption: purchaseDeliveryOption,
              deliveryAddress: purchase.deliveryAddress || undefined,
              status: 'pending',
              createdAt: purchase.createdAt || new Date().toISOString(),
              readyForPickupAt: null,
              pickedUpAt: null,
            })

            // Remove from pending purchases
            pendingPurchases.splice(purchaseIndex, 1)

            // Save updated shop data
            await writeDataFile('shop-products.json', {
              ...shopData,
              products,
              orders,
              pendingPurchases,
              updatedAt: new Date().toISOString(),
            })

            // Send confirmation email immediately with pickup information
            if (purchase.email || purchase.phoneNumber) {
              try {
                const productNames = orderItems.map((item) => item.productName).join(', ')
                await sendShopOrderConfirmationEmail({
                  email: purchase.email || undefined,
                  phoneNumber: purchase.phoneNumber || undefined,
                  orderId,
                  productName: productNames,
                  amount: purchase.amount || subtotal + transportationFee,
                  subtotal,
                  transportationFee,
                  deliveryOption: purchaseDeliveryOption,
                  deliveryAddress: purchase.deliveryAddress || undefined,
                  pickupLocation: shopData.pickupLocation || 'Pick up Mtaani',
                  pickupDays: shopData.pickupDays || ['Monday', 'Wednesday', 'Friday'],
                })
              } catch (emailError) {
                console.error('Error sending order confirmation email:', emailError)
                // Don't fail if email fails
              }
            }

            console.log(`✅ Shop purchase completed for ${orderItems.length} item(s). Order created: ${orderId}`)
            shopPurchaseHandled = true
          } else {
            console.error(
              `⚠️ No matching products found for checkoutRequestID ${checkoutRequestID}. Removing pending purchase to avoid duplicates.`,
            )
            pendingPurchases.splice(purchaseIndex, 1)
            await writeDataFile('shop-products.json', {
              ...shopData,
              pendingPurchases,
            })
          }
        }
      } catch (shopError) {
        console.error('Error updating shop purchase:', shopError)
        // Continue to check bookings
      }

      // Try to find and update the booking if not a shop purchase
      if (!shopPurchaseHandled) {
        try {
          const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
          const bookings = data.bookings || []
          
          // Find booking by checkoutRequestID (could be in initial deposit or balance payment)
          // Check both mpesaCheckoutRequestID and payments array
          const bookingIndex = bookings.findIndex(b => {
            if (b.mpesaCheckoutRequestID === checkoutRequestID) return true
            if (b.payments && Array.isArray(b.payments)) {
              return b.payments.some((p: any) => p.mpesaCheckoutRequestID === checkoutRequestID)
            }
            return false
          })

          if (bookingIndex !== -1) {
            const booking = bookings[bookingIndex]
            
            // Initialize payments array if it doesn't exist
            if (!booking.payments) {
              booking.payments = []
            }

            // Check if this payment is already recorded
            const paymentExists = booking.payments.some(
              (p: any) => p.mpesaCheckoutRequestID === checkoutRequestID
            )

            if (!paymentExists) {
              // Add payment record
              booking.payments.push({
                amount: amountInKSH,
                method: 'mpesa',
                date: new Date().toISOString(),
                mpesaCheckoutRequestID: checkoutRequestID,
                mpesaReceiptNumber: mpesaReceiptNumber,
                transactionDate: transactionDate,
              })

              // Update deposit (add the payment amount)
              booking.deposit = (booking.deposit || 0) + amountInKSH

              if ((booking.deposit || 0) >= booking.finalPrice) {
                if (!booking.paidInFullAt) {
                  booking.paidInFullAt = new Date().toISOString()
                }
              }

              // Save updated booking
              bookings[bookingIndex] = booking
              await writeDataFile('bookings.json', { bookings })

              console.log(`✅ Payment recorded for booking ${booking.id}: KSH ${amountInKSH.toLocaleString()}`)
            } else {
              console.log(`ℹ️ Payment already recorded for checkoutRequestID: ${checkoutRequestID}`)
            }
          } else {
            console.log(`⚠️ Booking not found for checkoutRequestID: ${checkoutRequestID}`)
          }
        } catch (bookingError) {
          console.error('Error updating booking with payment:', bookingError)
          // Don't fail the callback if booking update fails
        }
      }
    } else {
      console.log('❌ M-Pesa Payment Failed:', {
        resultCode,
        resultDesc,
        checkoutRequestID,
      })
    }

    // Always return success to M-Pesa (they expect 200 OK)
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully',
    })
  } catch (error: any) {
    console.error('Error processing M-Pesa callback:', error)
    
    // Still return success to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback received',
    })
  }
}

// M-Pesa also sends GET requests to verify the callback URL
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'M-Pesa callback endpoint is active',
  })
}

