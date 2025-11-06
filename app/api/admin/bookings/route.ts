import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

interface Booking {
  id: string
  name: string
  email: string
  phone: string
  service: string
  date: string
  timeSlot: string
  location: string
  originalPrice: number
  discount: number
  finalPrice: number
  deposit: number
  discountType?: string
  promoCode?: string
  mpesaCheckoutRequestID?: string
  createdAt: string
  testimonialRequested?: boolean
  testimonialRequestedAt?: string
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    
    const data = readDataFile<{ bookings: Booking[] }>('bookings.json')
    // Return all bookings, sorted by date (newest first)
    const bookings = (data.bookings || [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return NextResponse.json({ bookings })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ bookings: [] }, { status: 500 })
  }
}

