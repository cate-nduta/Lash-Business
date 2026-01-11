import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

interface YearlySubscriber {
  id: string
  name: string
  email: string
  phoneNumber?: string
  totalAnnualAmount: number // Total annual subscription amount (sum of all yearly products)
  yearlyItems: Array<{
    productId: string
    productName: string
    quantity: number
    annualPrice: number // Annual subscription price per item
  }>
  orderIds: string[] // Order IDs that contain yearly subscriptions
  createdAt: string
  lastRenewalDate?: string // Date of last annual payment
  nextRenewalDate?: string // Date when next payment is due
  paymentStatus: 'active' | 'pending' | 'overdue'
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

// GET: Fetch all yearly subscribers
export async function GET(request: NextRequest) {
  try {
    const subscribers = await readDataFile<YearlySubscriber[]>('labs-yearly-subscribers.json', [])
    
    // Sort by name
    subscribers.sort((a, b) => a.name.localeCompare(b.name))
    
    return NextResponse.json({ subscribers })
  } catch (error: any) {
    console.error('Error fetching subscribers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscribers', details: error.message },
      { status: 500 }
    )
  }
}

// POST: Sync subscribers from completed orders
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'sync') {
      // Sync subscribers from completed orders
      const orders = await readDataFile<Order[]>('labs-web-services-orders.json', [])
      const subscribers = await readDataFile<YearlySubscriber[]>('labs-yearly-subscribers.json', [])
      
      // Find all completed orders with yearly subscriptions
      const completedOrdersWithYearly = orders.filter(
        (order) => order.paymentStatus === 'completed' && 
        order.items.some((item) => item.billingPeriod === 'yearly')
      )
      
      // Group by email (one subscriber per email)
      const subscribersMap = new Map<string, YearlySubscriber>()
      
      // Initialize from existing subscribers
      subscribers.forEach((sub) => {
        subscribersMap.set(sub.email.toLowerCase(), sub)
      })
      
      // Process each completed order
      completedOrdersWithYearly.forEach((order) => {
        const emailKey = order.email.toLowerCase()
        const yearlyItems = order.items.filter((item) => item.billingPeriod === 'yearly')
        
        if (yearlyItems.length === 0) return
        
        // Calculate total annual amount for this order
        const orderAnnualAmount = yearlyItems.reduce(
          (sum, item) => sum + (item.price * item.quantity),
          0
        )
        
        if (subscribersMap.has(emailKey)) {
          // Update existing subscriber
          const existing = subscribersMap.get(emailKey)!
          
          // Check if this order is already tracked
          if (!existing.orderIds.includes(order.id)) {
            existing.orderIds.push(order.id)
            
            // Add yearly items from this order
            yearlyItems.forEach((item) => {
              const existingItem = existing.yearlyItems.find(
                (i) => i.productId === item.productId
              )
              
              if (existingItem) {
                existingItem.quantity += item.quantity
              } else {
                existing.yearlyItems.push({
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
                  annualPrice: item.price,
                })
              }
            })
            
            // Recalculate total annual amount
            existing.totalAnnualAmount = existing.yearlyItems.reduce(
              (sum, item) => sum + (item.annualPrice * item.quantity),
              0
            )
          }
        } else {
          // Create new subscriber
          const newSubscriber: YearlySubscriber = {
            id: `subscriber-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: order.name,
            email: order.email,
            phoneNumber: order.phoneNumber,
            totalAnnualAmount: orderAnnualAmount,
            yearlyItems: yearlyItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              annualPrice: item.price,
            })),
            orderIds: [order.id],
            createdAt: order.createdAt,
            paymentStatus: 'active',
          }
          
          subscribersMap.set(emailKey, newSubscriber)
        }
      })
      
      // Convert map back to array
      const updatedSubscribers = Array.from(subscribersMap.values())
      
      // Save updated subscribers
      await writeDataFile('labs-yearly-subscribers.json', updatedSubscribers)
      
      return NextResponse.json({
        success: true,
        message: `Synced ${updatedSubscribers.length} yearly subscribers`,
        subscribers: updatedSubscribers,
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error syncing subscribers:', error)
    return NextResponse.json(
      { error: 'Failed to sync subscribers', details: error.message },
      { status: 500 }
    )
  }
}

