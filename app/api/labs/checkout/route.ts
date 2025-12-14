import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import crypto from 'crypto'
// Note: sendLabsSetupEmail is imported dynamically to avoid circular dependencies

export const dynamic = 'force-dynamic'

interface TierOrder {
  orderId: string
  tierId: string
  businessName: string
  email: string
  phone?: string
  paymentMethod: 'mpesa' | 'card' | 'free'
  amountKES: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  checkoutRequestID?: string
  createdAt: string
  completedAt?: string
  accountCreated: boolean
  subdomain?: string
  customDomain?: string
}

export async function POST(request: NextRequest) {
  let body: any = {}
  try {
    body = await request.json()
    const { tierId, businessName, email, phone, paymentMethod, currency } = body

    // Validate required fields (paymentMethod is optional for free tiers)
    if (!tierId || !businessName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: tierId, businessName, and email are required' },
        { status: 400 }
      )
    }

    // Load tier information
    let labsSettings
    try {
      labsSettings = await readDataFile<any>('labs-settings.json', { tiers: [] })
    } catch (error) {
      console.error('Error reading labs-settings.json:', error)
      return NextResponse.json(
        { error: 'Failed to load tier information. Please try again.' },
        { status: 500 }
      )
    }

    const tier = labsSettings.tiers?.find((t: any) => t.id === tierId)

    if (!tier) {
      return NextResponse.json(
        { error: `Tier not found: ${tierId}. Available tiers: ${labsSettings.tiers?.map((t: any) => t.id).join(', ') || 'none'}` },
        { status: 404 }
      )
    }

    // Determine if this is a free tier
    const isFreeTier = tier.priceKES === 0 || tier.priceKES === null || tier.priceKES === undefined

    // For paid tiers, paymentMethod is required
    if (!isFreeTier && (!paymentMethod || paymentMethod === 'null' || paymentMethod === null)) {
      return NextResponse.json(
        { error: 'Payment method is required for paid tiers' },
        { status: 400 }
      )
    }

    // Generate order ID
    const orderId = `labs-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

    // Generate subdomain from business name
    let subdomain = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
    
    // Ensure subdomain is not empty
    if (!subdomain || subdomain.trim().length === 0) {
      subdomain = `business-${Date.now()}`
    }

    // Create order
    const order: TierOrder = {
      orderId,
      tierId,
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      paymentMethod: isFreeTier ? 'free' : (paymentMethod || 'card'), // Use 'free' for free tiers
      amountKES: tier.priceKES,
      currency: currency || 'KES',
      status: 'pending',
      createdAt: new Date().toISOString(),
      accountCreated: false,
      subdomain: `${subdomain}.lashdiarylabs.com`,
    }

    // Load existing orders
    let orders: TierOrder[]
    try {
      orders = await readDataFile<TierOrder[]>('labs-orders.json', [])
    } catch (error) {
      console.error('Error reading labs-orders.json, initializing empty array:', error)
      orders = []
    }

    // Check if subdomain is already taken
    const existingSubdomain = orders.find(o => o.subdomain === order.subdomain && o.status === 'completed')
    if (existingSubdomain) {
      order.subdomain = `${subdomain}-${Date.now()}.lashdiarylabs.com`
    }

    // Handle free tiers (priceKES: 0) - skip payment and create account directly
    if (isFreeTier) {
      // Mark order as completed immediately for free tiers
      order.status = 'completed'
      order.completedAt = new Date().toISOString()
      
      // Save order
      orders.push(order)
      await writeDataFile('labs-orders.json', orders)

      // Create account immediately for free tiers
      // Generate a secure password
      const password = crypto.randomBytes(12).toString('hex')
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')

      // Create user account
      let users: any[]
      try {
        const usersData = await readDataFile<any>('users.json', { users: [] })
        // Handle both array format and object format { users: [] }
        users = Array.isArray(usersData) ? usersData : (usersData?.users || [])
      } catch (error) {
        console.error('Error reading users.json, initializing empty array:', error)
        users = []
      }
      
      // Ensure users is an array
      if (!Array.isArray(users)) {
        users = []
      }
      
      // Check if user already exists
      const existingUser = users.find(u => u.email === order.email)
      let userId: string
      
      if (existingUser) {
        // Update existing user with labs access
        existingUser.labsAccess = true
        existingUser.labsOrderId = order.orderId
        existingUser.labsSubdomain = order.subdomain
        existingUser.labsTierId = order.tierId
        existingUser.labsBusinessName = order.businessName
        await writeDataFile('users.json', users)
        userId = existingUser.id
      } else {
        // Create new user
        userId = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
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
      }

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
          faviconUrl: ''
        },
        social: {
          instagram: '',
          facebook: '',
          tiktok: '',
          twitter: ''
        }
      }

      const settingsFileName = `labs-settings-${order.subdomain?.replace('.lashdiarylabs.com', '') || order.orderId}.json`
      await writeDataFile(settingsFileName, businessSettings)
      
      // Mark account as created
      order.accountCreated = true
      const updatedOrders = orders.map(o => o.orderId === orderId ? order : o)
      await writeDataFile('labs-orders.json', updatedOrders)
      
      // Send payment receipt for free tiers (showing $0)
      try {
        const { sendPaymentReceipt } = await import('@/lib/receipt-email-utils')
        await sendPaymentReceipt({
          recipientEmail: order.email,
          recipientName: order.businessName,
          amount: 0,
          currency: order.currency || 'KES',
          paymentMethod: 'Free Tier',
          transactionId: order.orderId,
          transactionDate: order.completedAt || new Date().toISOString(),
          businessName: order.businessName,
          orderId: order.orderId,
          labsOrderId: order.orderId,
          tierName: tier.name,
          description: `Free tier activation: ${tier.name}`,
        }, order.orderId)
        console.log(`✅ Payment receipt sent for free tier order ${order.orderId}`)
      } catch (receiptError) {
        console.error('Error sending payment receipt:', receiptError)
        // Don't fail if receipt email fails
      }
      
      // Send setup email with login instructions for free tiers
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://lashdiary.co.ke'
        const loginUrl = `${baseUrl}/labs/login?orderId=${order.orderId}`
        
        // Import and send setup email
        const { sendLabsSetupEmail } = await import('@/app/api/labs/email/utils')
        
        // For new users, include password in email
        const emailData: any = {
          businessName: order.businessName,
          email: order.email,
          tierName: tier.name,
          subdomain: order.subdomain || '',
          loginUrl: loginUrl,
        }
        
        // Only include password for new users (not existing users)
        if (!existingUser && password) {
          emailData.password = password
        }
        
        await sendLabsSetupEmail(emailData)
        console.log(`✅ Setup email sent for free tier order ${order.orderId}`)
      } catch (emailError) {
        console.error('Error sending labs setup email:', emailError)
        // Don't fail if email fails
      }

      return NextResponse.json({
        success: true,
        orderId,
        message: 'Free tier activated! Your account has been created.',
        freeTier: true,
        userId: userId,
      })
    }

    // Save order
    orders.push(order)
    await writeDataFile('labs-orders.json', orders)

    // Process payment based on method (for paid tiers)
    if (paymentMethod === 'mpesa') {
      if (!phone) {
        return NextResponse.json(
          { error: 'Phone number is required for M-Pesa payment' },
          { status: 400 }
        )
      }

      // Initiate M-Pesa STK Push
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://lashdiary.co.ke'
        const mpesaResponse = await fetch(`${baseUrl}/api/mpesa/stk-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone.replace(/^\+/, ''), // Remove + if present
            amount: tier.priceKES,
            accountReference: orderId,
            transactionDesc: `LashDiary Labs - ${tier.name}`,
          }),
        })

        const mpesaData = await mpesaResponse.json()

        if (mpesaResponse.ok && mpesaData.checkoutRequestID) {
          // Update order with checkout request ID
          order.checkoutRequestID = mpesaData.checkoutRequestID
          order.status = 'processing'
          
          // Update order in file
          const updatedOrders = orders.map(o => o.orderId === orderId ? order : o)
          await writeDataFile('labs-orders.json', updatedOrders)

          return NextResponse.json({
            success: true,
            orderId,
            checkoutRequestID: mpesaData.checkoutRequestID,
            message: mpesaData.message || 'M-Pesa payment prompt sent to your phone',
          })
        } else {
          return NextResponse.json(
            { error: mpesaData.error || 'Failed to initiate M-Pesa payment' },
            { status: 500 }
          )
        }
      } catch (error: any) {
        console.error('M-Pesa payment error:', error)
        return NextResponse.json(
          { error: 'Failed to initiate payment. Please try again.' },
          { status: 500 }
        )
      }
    } else if (paymentMethod === 'card') {
      // For card payments, you would integrate with a payment gateway
      // For now, we'll mark it as processing and return success
      // In production, you'd redirect to payment gateway or use Stripe/PayPal etc.
      
      order.status = 'processing'
      const updatedOrders = orders.map(o => o.orderId === orderId ? order : o)
      await writeDataFile('labs-orders.json', updatedOrders)

      return NextResponse.json({
        success: true,
        orderId,
        message: 'Card payment processing (integration pending)',
      })
    }

    return NextResponse.json(
      { error: 'Invalid payment method' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Checkout error:', error)
    console.error('Error stack:', error?.stack)
    console.error('Request body:', { tierId: body?.tierId, email: body?.email, businessName: body?.businessName })
    return NextResponse.json(
      { 
        error: 'Failed to process checkout',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please check server logs for details'
      },
      { status: 500 }
    )
  }
}

