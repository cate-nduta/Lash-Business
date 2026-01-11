import { NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface DailyOrderCount {
  date: string // Format: DDMMYYYY
  count: number
}

interface OrderCountData {
  dailyCounts: DailyOrderCount[]
  lastUpdated: string
}

const DEFAULT_DATA: OrderCountData = {
  dailyCounts: [],
  lastUpdated: new Date().toISOString(),
}

export async function GET() {
  try {
    const today = new Date()
    const day = String(today.getDate()).padStart(2, '0')
    const month = String(today.getMonth() + 1) // No padding - single digit months stay single digit
    const year = today.getFullYear()
    const dateString = `${day}${month}${year}` // Format: DDMYYYY (e.g., 1112026 for Jan 11, 2026)
    
    // Ensure date string is valid
    if (!dateString || dateString.length < 7) {
      throw new Error('Invalid date string generated')
    }

    // Load order count data
    let data: OrderCountData
    try {
      data = await readDataFile<OrderCountData>('labs-order-counts', DEFAULT_DATA)
    } catch (error) {
      console.error('Error reading order counts:', error)
      data = DEFAULT_DATA
    }

    // Find or create today's count
    let todayCount = data.dailyCounts.find(c => c.date === dateString)
    
    if (!todayCount) {
      // First order of the day
      todayCount = { date: dateString, count: 1 }
      data.dailyCounts.push(todayCount)
    } else {
      // Increment count for today
      todayCount.count += 1
    }

    // Clean up old entries (older than 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    data.dailyCounts = data.dailyCounts.filter(count => {
      // Parse date string: DDMYYYY format (e.g., 1112026 for Jan 11, 2026)
      // Format: DD (2 digits) + M (1-2 digits) + YYYY (4 digits)
      const dateStr = count.date
      let day, month, year
      
      // Try to parse DDMYYYY format (7 characters)
      if (dateStr.length === 7) {
        // DDMYYYY format (e.g., 1112026)
        day = parseInt(dateStr.slice(0, 2))
        month = parseInt(dateStr.slice(2, 3))
        year = parseInt(dateStr.slice(3, 7))
      } else if (dateStr.length === 8) {
        // DDMMYYYY format (e.g., 11012026) - legacy format support
        day = parseInt(dateStr.slice(0, 2))
        month = parseInt(dateStr.slice(2, 4))
        year = parseInt(dateStr.slice(4, 8))
      } else {
        // Invalid format, remove it
        return false
      }
      
      // Validate parsed values
      if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12) {
        return false
      }
      
      const countDate = new Date(year, month - 1, day)
      return countDate >= thirtyDaysAgo
    })

    data.lastUpdated = new Date().toISOString()

    // Save updated data
    await writeDataFile('labs-order-counts', data)

    // Generate order ID: DDMYYYY + order number (3 digits)
    // Example: 1112026001 (11th Jan 2026, order 001)
    const orderNumber = String(todayCount.count).padStart(3, '0')
    const orderId = `${dateString}${orderNumber}`

    return NextResponse.json({ 
      success: true, 
      orderId,
      date: dateString,
      orderNumber: todayCount.count
    })
  } catch (error: any) {
    console.error('Error generating order ID:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate order ID' },
      { status: 500 }
    )
  }
}

