import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

interface Booking {
  email: string
  name: string
  date: string
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    
    const data = readDataFile<{ bookings: Booking[] }>('bookings.json')
    const bookings = data.bookings || []
    
    // Group by email and aggregate data
    const customerMap = new Map<string, {
      email: string
      name: string
      totalBookings: number
      lastBookingDate: string
    }>()

    bookings.forEach(booking => {
      const existing = customerMap.get(booking.email)
      if (existing) {
        existing.totalBookings += 1
        const bookingDate = new Date(booking.date)
        const lastDate = new Date(existing.lastBookingDate)
        if (bookingDate > lastDate) {
          existing.lastBookingDate = booking.date
        }
      } else {
        customerMap.set(booking.email, {
          email: booking.email,
          name: booking.name,
          totalBookings: 1,
          lastBookingDate: booking.date,
        })
      }
    })

    const customers = Array.from(customerMap.values())
      .sort((a, b) => new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime())

    return NextResponse.json({ customers })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching customers:', error)
    return NextResponse.json({ customers: [] }, { status: 500 })
  }
}

