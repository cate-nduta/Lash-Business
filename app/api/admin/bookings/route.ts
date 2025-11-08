import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'

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
  status: 'confirmed' | 'cancelled' | 'completed'
  calendarEventId?: string | null
  cancelledAt?: string | null
  cancelledBy?: 'admin' | 'client' | null
  cancellationReason?: string | null
  refundStatus?: 'not_required' | 'not_applicable' | 'pending' | 'refunded' | 'retained'
  refundAmount?: number | null
  refundNotes?: string | null
  rescheduledAt?: string | null
  rescheduledBy?: 'admin' | 'client' | null
  rescheduleHistory?: Array<{
    fromDate: string
    fromTimeSlot: string
    toDate: string
    toTimeSlot: string
    rescheduledAt: string
    rescheduledBy: 'admin' | 'client'
    notes?: string | null
  }>
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const data = await readDataFile<{ bookings: Booking[] }>('bookings.json', { bookings: [] })
    const bookings = (data.bookings || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ bookings })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ bookings: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const body = await request.json()
    const existing = await readDataFile<{ bookings: Booking[] }>('bookings.json', { bookings: [] })
    const bookings: Booking[] = [...(existing.bookings || []), body]
    await writeDataFile('bookings.json', { bookings })
    const createdBooking = bookings.find((booking) => booking.id === body.id)
    await recordActivity({
      module: 'bookings',
      action: 'create',
      performedBy,
      summary: `Created booking for ${createdBooking?.name || body.name || 'client'}`,
      targetId: createdBooking?.id || body.id,
      targetType: 'booking',
      details: createdBooking || body,
    })
    return NextResponse.json({ success: true, bookings })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating booking:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

