import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendShopOrderConfirmationEmail } from '@/app/api/shop/email/utils'
import { sendLabsSetupEmail } from '@/app/api/labs/email/utils'
import { sendPaymentReceipt } from '@/lib/receipt-email-utils'
import crypto from 'crypto'

// Helper function to create labs account after payment
async function createLabsAccount(order: any): Promise<{ userId: string; password: string | null }> {
  // Generate a secure password
  const password = crypto.randomBytes(12).toString('hex')
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')

  // Create user account
  const users = await readDataFile<any[]>('users.json', [])
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === order.email)
  if (existingUser) {
    // Update existing user with labs access
    existingUser.labsAccess = true
    existingUser.labsOrderId = order.orderId
    existingUser.labsSubdomain = order.subdomain
    existingUser.labsTierId = order.tierId
    existingUser.labsBusinessName = order.businessName
    await writeDataFile('users.json', users)
    return { userId: existingUser.id, password: null } // Don't return password for existing users
  }

  // Create new user
  const userId = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const newUser = {
    id: userId,
    email: order.email,
    name: order.businessName,
    phone: order.phone,
    password: hashedPassword,
    role: 'labs-user',
    labsAccess: true,
    labsOrderId: order.orderId,
    labsSubdomain: order.subdomain,
    labsTierId: order.tierId,
    labsBusinessName: order.businessName,
    createdAt: new Date().toISOString(),
  }

  users.push(newUser)
  await writeDataFile('users.json', users)

  // Create initial settings file for this business
  const businessSettings = {
    business: {
      name: order.businessName,
      email: order.email,
      phone: order.phone || '',
      address: '',
      description: '',
      logoType: 'text' as const,
      logoUrl: '',
      logoText: order.businessName,
      logoColor: '#733D26',
      faviconUrl: '',
      faviconVersion: 0,
      taxPercentage: 0,
    },
    social: {
      instagram: '',
      facebook: '',
      tiktok: '',
      twitter: '',
    },
    newsletter: {
      discountPercentage: 10,
    },
  }

  // Save settings for this subdomain
  const settingsFileName = `labs-${order.orderId}-settings.json`
  await writeDataFile(settingsFileName, businessSettings)

  return { userId, password }
}

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

      // Try to find and update labs order if not a shop purchase
      let labsOrderHandled = false
      if (!shopPurchaseHandled) {
        try {
          const labsOrders = await readDataFile<any[]>('labs-orders.json', [])
          const orderIndex = labsOrders.findIndex(
            (o: any) => o.checkoutRequestID === checkoutRequestID
          )

          if (orderIndex !== -1) {
            const order = labsOrders[orderIndex]
            
            // Update order status
            order.status = 'completed'
            order.completedAt = new Date().toISOString()
            order.mpesaReceiptNumber = mpesaReceiptNumber
            order.transactionDate = transactionDate

            // Create account automatically
            if (!order.accountCreated) {
              try {
                const accountResult = await createLabsAccount(order)
                order.accountCreated = true
                order.userId = accountResult.userId
                order.password = accountResult.password // Store password temporarily for email
                console.log(`✅ Labs account created for order ${order.orderId}`)
              } catch (accountError) {
                console.error('Error creating labs account:', accountError)
                // Don't fail the payment if account creation fails
              }
            }

            // Save updated order
            labsOrders[orderIndex] = order
            await writeDataFile('labs-orders.json', labsOrders)

            // Send referral code used notification if applicable
            if (order.appliedReferralCode && order.referrerEmail && order.status === 'completed') {
              try {
                const { sendReferralCodeUsedNotification } = await import('@/app/api/labs/web-services/email-utils')
                const webServicesData = await readDataFile<any>('labs-web-services.json', {
                  referrerRewardPercentage: 5,
                })
                const rewardPercentage = webServicesData.referrerRewardPercentage || 5
                const orderTotal = order.originalAmountKES || order.amountKES
                const rewardAmount = Math.round(orderTotal * (rewardPercentage / 100))
                
                await sendReferralCodeUsedNotification({
                  referrerEmail: order.referrerEmail,
                  referralCode: order.appliedReferralCode,
                  customerEmail: order.email,
                  orderTotal: orderTotal,
                  rewardPercentage: rewardPercentage,
                  rewardAmount: rewardAmount,
                })
                console.log('✅ Referral code used notification sent to:', order.referrerEmail)
              } catch (emailError) {
                console.error('Error sending referral code used notification:', emailError)
              }
            }

            // Load tier information to get tier name (used in multiple places)
            const labsSettings = await readDataFile<any>('labs-settings.json', { tiers: [] })
            const tier = labsSettings.tiers?.find((t: any) => t.id === order.tierId)
            const tierName = tier?.name || order.tierId

            // Send setup email with instructions
            try {
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://lashdiary.co.ke'

              // Include password in email if it's a new account
              const emailData: any = {
                businessName: order.businessName,
                email: order.email,
                tierName: tierName,
                subdomain: order.subdomain || '',
                loginUrl: `${baseUrl}/labs/login?orderId=${order.orderId}`,
              }
              
              // Include password if it was generated (new user)
              if (order.password) {
                emailData.password = order.password
              }
              
              await sendLabsSetupEmail(emailData)
              
              // Clear password from order after sending email (security)
              delete order.password
              console.log(`✅ Setup email sent for order ${order.orderId}`)
            } catch (emailError) {
              console.error('Error sending labs setup email:', emailError)
              // Don't fail the payment if email fails
            }

            // Send payment receipt
            try {
              await sendPaymentReceipt({
                recipientEmail: order.email,
                recipientName: order.businessName,
                amount: order.amountKES,
                currency: order.currency || 'KES',
                paymentMethod: 'M-Pesa',
                transactionId: order.orderId,
                transactionDate: order.completedAt || new Date().toISOString(),
                businessName: order.businessName,
                orderId: order.orderId,
                labsOrderId: order.orderId,
                tierName: tierName,
                mpesaReceiptNumber: mpesaReceiptNumber || undefined,
                description: `Payment for ${tierName}`,
              }, order.orderId)
              console.log(`✅ Payment receipt sent for order ${order.orderId}`)
            } catch (receiptError) {
              console.error('Error sending payment receipt:', receiptError)
              // Don't fail the payment if receipt email fails
            }

            console.log(`✅ Labs order completed: ${order.orderId}`)
            labsOrderHandled = true
          }
        } catch (labsError) {
          console.error('Error updating labs order:', labsError)
          // Continue to check bookings
        }
      }

      // Try to find and update the booking if not a shop purchase or labs order
      if (!shopPurchaseHandled && !labsOrderHandled) {
        try {
          const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
          const bookings = data.bookings || []
          
          // Find booking by checkoutRequestID (could be in initial deposit or balance payment)
          // Check mpesaCheckoutRequestID and payments array
          const bookingIndex = bookings.findIndex(b => {
            if (b.mpesaCheckoutRequestID === checkoutRequestID) return true
            if (b.payments && Array.isArray(b.payments)) {
              return b.payments.some((p: any) => p.mpesaCheckoutRequestID === checkoutRequestID)
            }
            return false
          })

          if (bookingIndex !== -1) {
            const booking = bookings[bookingIndex]
            
            // Handle regular deposit payment
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

              // Check if fully paid
              if ((booking.deposit || 0) >= (booking.finalPrice || booking.originalPrice || 0)) {
                if (!booking.paidInFullAt) {
                  booking.paidInFullAt = new Date().toISOString()
                }
                booking.paidInFull = true
              }
              
              // If payment type was 'full', mark as fully paid
              if (booking.paymentType === 'full') {
                booking.paidInFull = true
                if (!booking.paidInFullAt) {
                  booking.paidInFullAt = new Date().toISOString()
                }
              }

              // Save updated booking
              bookings[bookingIndex] = booking
              await writeDataFile('bookings.json', { bookings })

              console.log(`✅ Payment recorded for booking ${booking.id}: KSH ${amountInKSH.toLocaleString()}`)

              // Send payment receipt
              try {
                await sendPaymentReceipt({
                  recipientEmail: booking.email || '',
                  recipientName: booking.name || 'Customer',
                  amount: amountInKSH,
                  currency: 'KES',
                  paymentMethod: 'M-Pesa',
                  transactionId: mpesaReceiptNumber || checkoutRequestID,
                  transactionDate: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
                  bookingId: booking.id,
                  serviceName: booking.service || undefined,
                  mpesaReceiptNumber: mpesaReceiptNumber || undefined,
                  description: booking.service ? `Payment for ${booking.service}` : 'Booking payment',
                })
                console.log(`✅ Payment receipt sent for booking ${booking.id}`)
              } catch (receiptError) {
                console.error('Error sending payment receipt:', receiptError)
                // Don't fail the payment if receipt email fails
              }
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

