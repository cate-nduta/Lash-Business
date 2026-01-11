import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'
import { sendEmailViaZoho, BUSINESS_NOTIFICATION_EMAIL, FROM_EMAIL, EMAIL_FROM_NAME } from '@/lib/email/zoho-config'

export const dynamic = 'force-dynamic'

interface MonthlySubscriber {
  id: string
  name: string
  email: string
  phoneNumber?: string
  totalMonthlyAmount: number // Total monthly subscription amount (sum of all monthly products)
  monthlyItems: Array<{
    productId: string
    productName: string
    quantity: number
    monthlyPrice: number // Monthly subscription price per item
  }>
  orderIds: string[] // Order IDs that contain monthly subscriptions
  createdAt: string
  lastPaymentDate?: string // Date of last monthly payment
  nextPaymentDate?: string // Date when next payment is due
  paymentStatus: 'active' | 'pending' | 'overdue' | 'suspended'
  lastReminderSent?: string // ISO date when last reminder email was sent
  reminderCount?: number // Number of reminders sent
  suspendedAt?: string // ISO date when service was suspended (5 days after reminder)
}

interface Order {
  id: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
    billingPeriod?: 'one-time' | 'yearly' | 'monthly'
    setupFee?: number
  }>
  paymentStatus: 'pending' | 'partial' | 'completed'
  name: string
  email: string
  phoneNumber?: string
  createdAt: string
}

// GET: Fetch all monthly subscribers
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const subscribers = await readDataFile<MonthlySubscriber[]>('labs-monthly-subscribers.json', [])
    
    // Sort by name
    subscribers.sort((a, b) => a.name.localeCompare(b.name))
    
    return NextResponse.json({ subscribers })
  } catch (error: any) {
    console.error('Error fetching monthly subscribers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monthly subscribers', details: error.message },
      { status: 500 }
    )
  }
}

// POST: Sync subscribers from completed orders or send payment reminder
export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const { action, subscriberId } = body
    
    if (action === 'sync') {
      // Sync subscribers from completed orders
      const orders = await readDataFile<Order[]>('labs-web-services-orders.json', [])
      const subscribers = await readDataFile<MonthlySubscriber[]>('labs-monthly-subscribers.json', [])
      
      // Find all completed orders with monthly subscriptions
      const completedOrdersWithMonthly = orders.filter(
        (order) => order.paymentStatus === 'completed' && 
        order.items.some((item) => item.billingPeriod === 'monthly')
      )
      
      // Group by email (one subscriber per email)
      const subscribersMap = new Map<string, MonthlySubscriber>()
      
      // Initialize from existing subscribers
      subscribers.forEach((sub) => {
        subscribersMap.set(sub.email.toLowerCase(), sub)
      })
      
      // Process each completed order
      completedOrdersWithMonthly.forEach((order) => {
        const emailKey = order.email.toLowerCase()
        const monthlyItems = order.items.filter((item) => item.billingPeriod === 'monthly')
        
        if (monthlyItems.length === 0) return
        
        // Calculate total monthly amount for this order
        const orderMonthlyAmount = monthlyItems.reduce(
          (sum, item) => sum + (item.price * item.quantity),
          0
        )
        
        if (subscribersMap.has(emailKey)) {
          // Update existing subscriber
          const existing = subscribersMap.get(emailKey)!
          
          // Check if this order is already tracked
          if (!existing.orderIds.includes(order.id)) {
            existing.orderIds.push(order.id)
            
            // Add monthly items from this order
            monthlyItems.forEach((item) => {
              const existingItem = existing.monthlyItems.find(
                (i) => i.productId === item.productId
              )
              
              if (existingItem) {
                existingItem.quantity += item.quantity
              } else {
                existing.monthlyItems.push({
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
                  monthlyPrice: item.price,
                })
              }
            })
            
            // Recalculate total monthly amount
            existing.totalMonthlyAmount = existing.monthlyItems.reduce(
              (sum, item) => sum + (item.monthlyPrice * item.quantity),
              0
            )
          }
        } else {
          // Create new subscriber
          const now = new Date()
          const nextMonth = new Date(now)
          nextMonth.setMonth(nextMonth.getMonth() + 1)
          
          const newSubscriber: MonthlySubscriber = {
            id: `monthly-subscriber-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: order.name,
            email: order.email,
            phoneNumber: order.phoneNumber,
            totalMonthlyAmount: orderMonthlyAmount,
            monthlyItems: monthlyItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              monthlyPrice: item.price,
            })),
            orderIds: [order.id],
            createdAt: order.createdAt,
            lastPaymentDate: order.createdAt,
            nextPaymentDate: nextMonth.toISOString().split('T')[0],
            paymentStatus: 'active',
            reminderCount: 0,
          }
          
          subscribersMap.set(emailKey, newSubscriber)
        }
      })
      
      // Convert map back to array
      const updatedSubscribers = Array.from(subscribersMap.values())
      
      // Save updated subscribers
      await writeDataFile('labs-monthly-subscribers.json', updatedSubscribers)
      
      return NextResponse.json({
        success: true,
        message: `Synced ${updatedSubscribers.length} monthly subscribers`,
        subscribers: updatedSubscribers,
      })
    }
    
    if (action === 'send-payment-email' && subscriberId) {
      // Send Paystack payment email reminder
      const subscribers = await readDataFile<MonthlySubscriber[]>('labs-monthly-subscribers.json', [])
      const subscriber = subscribers.find((s) => s.id === subscriberId)
      
      if (!subscriber) {
        return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
      }
      
      // Generate payment link
      // In production, this would use Paystack API to generate a payment link
      // For now, we'll create a payment link that can be used
      const paymentReference = `monthly-${subscriber.id}-${Date.now()}`
      const paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'}/labs/subscription-payment?amount=${subscriber.totalMonthlyAmount * 100}&email=${encodeURIComponent(subscriber.email)}&name=${encodeURIComponent(subscriber.name)}&reference=${paymentReference}&type=monthly&subscriberId=${subscriber.id}`
      
      const now = new Date().toISOString()
      subscriber.lastReminderSent = now
      subscriber.reminderCount = (subscriber.reminderCount || 0) + 1
      subscriber.paymentStatus = subscriber.paymentStatus === 'active' ? 'pending' : subscriber.paymentStatus
      
      // Calculate suspension date (5 days after reminder)
      const suspensionDate = new Date(now)
      suspensionDate.setDate(suspensionDate.getDate() + 5)
      
      await writeDataFile('labs-monthly-subscribers.json', subscribers)
      
      // Send email to subscriber
      try {
        const emailSubject = `Monthly Maintenance Payment Reminder - KES ${subscriber.totalMonthlyAmount.toLocaleString()}`
        const emailHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #7C4B31;">Monthly Maintenance Payment Reminder</h1>
                <p>Dear ${subscriber.name},</p>
                <p>This is a friendly reminder that your monthly maintenance payment is due.</p>
                <div style="background: #F3E6DC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #7C4B31; margin-top: 0;">Payment Details</h2>
                  <p><strong>Amount Due:</strong> KES ${subscriber.totalMonthlyAmount.toLocaleString()}</p>
                  <p><strong>Services:</strong></p>
                  <ul>
                    ${subscriber.monthlyItems.map(item => `<li>${item.productName} (${item.quantity}x) - KES ${item.monthlyPrice.toLocaleString()}/month</li>`).join('')}
                  </ul>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${paymentLink}" style="background: #7C4B31; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Pay Now via Paystack
                  </a>
                </div>
                <p><strong>Important:</strong> If payment is not received within 5 days, your monthly maintenance services will be automatically suspended.</p>
                <p>If you have any questions or concerns, please contact us at ${BUSINESS_NOTIFICATION_EMAIL}.</p>
                <p>Best regards,<br>The LashDiary Team</p>
              </div>
            </body>
          </html>
        `
        
        await sendEmailViaZoho({
          to: subscriber.email,
          subject: emailSubject,
          html: emailHtml,
          text: `Monthly Maintenance Payment Reminder\n\nDear ${subscriber.name},\n\nYour monthly maintenance payment of KES ${subscriber.totalMonthlyAmount.toLocaleString()} is due. Please pay using this link: ${paymentLink}\n\nIf payment is not received within 5 days, your services will be suspended.\n\nBest regards,\nThe LashDiary Team`,
        })
      } catch (emailError: any) {
        console.error('Error sending payment reminder email:', emailError)
        // Continue even if email fails - we've already tracked the reminder
      }
      
      return NextResponse.json({
        success: true,
        message: 'Payment reminder email sent successfully. Service will be suspended 5 days from now if payment is not received.',
        suspensionDate: suspensionDate.toISOString().split('T')[0],
        paymentLink, // Include payment link in response for admin reference
      })
    }
    
    if (action === 'suspend-service' && subscriberId) {
      // Manually suspend service
      const subscribers = await readDataFile<MonthlySubscriber[]>('labs-monthly-subscribers.json', [])
      const subscriber = subscribers.find((s) => s.id === subscriberId)
      
      if (!subscriber) {
        return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
      }
      
      subscriber.paymentStatus = 'suspended'
      subscriber.suspendedAt = new Date().toISOString()
      
      await writeDataFile('labs-monthly-subscribers.json', subscribers)
      
      return NextResponse.json({
        success: true,
        message: 'Service suspended successfully',
      })
    }
    
    if (action === 'reactivate-service' && subscriberId) {
      // Reactivate service after payment
      const subscribers = await readDataFile<MonthlySubscriber[]>('labs-monthly-subscribers.json', [])
      const subscriber = subscribers.find((s) => s.id === subscriberId)
      
      if (!subscriber) {
        return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
      }
      
      const now = new Date()
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      
      subscriber.paymentStatus = 'active'
      subscriber.lastPaymentDate = now.toISOString().split('T')[0]
      subscriber.nextPaymentDate = nextMonth.toISOString().split('T')[0]
      subscriber.lastReminderSent = undefined
      subscriber.reminderCount = 0
      subscriber.suspendedAt = undefined
      
      await writeDataFile('labs-monthly-subscribers.json', subscribers)
      
      return NextResponse.json({
        success: true,
        message: 'Service reactivated successfully',
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in monthly subscribers POST:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    )
  }
}

// PUT: Update subscriber (e.g., after payment received)
export async function PUT(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const { subscriberId, paymentReceived } = body
    
    if (!subscriberId || !paymentReceived) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const subscribers = await readDataFile<MonthlySubscriber[]>('labs-monthly-subscribers.json', [])
    const subscriber = subscribers.find((s) => s.id === subscriberId)
    
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }
    
    // Update payment dates
    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    
    subscriber.lastPaymentDate = now.toISOString().split('T')[0]
    subscriber.nextPaymentDate = nextMonth.toISOString().split('T')[0]
    subscriber.paymentStatus = 'active'
    subscriber.lastReminderSent = undefined
    subscriber.reminderCount = 0
    subscriber.suspendedAt = undefined
    
    await writeDataFile('labs-monthly-subscribers.json', subscribers)
    
    return NextResponse.json({
      success: true,
      message: 'Subscriber updated successfully',
      subscriber,
    })
  } catch (error: any) {
    console.error('Error updating monthly subscriber:', error)
    return NextResponse.json(
      { error: 'Failed to update subscriber', details: error.message },
      { status: 500 }
    )
  }
}

