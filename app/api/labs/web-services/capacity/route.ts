import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

interface Order {
  id: string
  createdAt: string
  status: 'pending' | 'in_progress' | 'completed' | 'delivered'
  paymentStatus: 'pending' | 'partial' | 'completed'
}

interface WebServicesData {
  monthlyCapacity?: number // Default 7
}

// Get current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// Count orders for the current month
async function getCurrentMonthOrderCount(): Promise<number> {
  try {
    const orders = await readDataFile<Order[]>('labs-web-services-orders.json', [])
    const currentMonth = getCurrentMonth()
    
    // Count orders created this month (regardless of status)
    const monthOrders = orders.filter((order) => {
      if (!order.createdAt) return false
      const orderDate = new Date(order.createdAt)
      const orderMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
      return orderMonth === currentMonth
    })
    
    return monthOrders.length
  } catch (error) {
    console.error('Error counting monthly orders:', error)
    return 0
  }
}

// GET: Check if capacity is reached
export async function GET(request: NextRequest) {
  try {
    const webServicesData = await readDataFile<WebServicesData>('labs-web-services.json', { monthlyCapacity: 7 })
    const orderCount = await getCurrentMonthOrderCount()

    const monthlyCapacity = webServicesData.monthlyCapacity || 7
    const isCapacityReached = orderCount >= monthlyCapacity
    const currentMonth = getCurrentMonth()

    return NextResponse.json({
      currentMonth,
      orderCount,
      monthlyCapacity,
      isCapacityReached,
      remainingSlots: Math.max(0, monthlyCapacity - orderCount),
    })
  } catch (error: any) {
    console.error('Error checking capacity:', error)
    return NextResponse.json(
      { error: 'Failed to check capacity', details: error.message },
      { status: 500 }
    )
  }
}

