import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

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
  status: 'confirmed' | 'cancelled' | 'completed' | 'paid'
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
  desiredLook?: string | null
  desiredLookStatus?: 'recommended' | 'custom' | null
  desiredLookStatusMessage?: string | null
  desiredLookMatchesRecommendation?: boolean | null
  additionalServices?: Array<{
    name: string
    price: number
    addedAt: string
  }>
  fine?: {
    amount: number
    reason: string
    addedAt: string
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const body = await request.json()
    const { bookingId, action, serviceName, servicePrice, fineReason } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const data = await readDataFile<{ bookings: Booking[] }>('bookings.json', { bookings: [] })
    const booking = data.bookings.find((b) => b.id === bookingId)

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    let updatedBooking = { ...booking }
    let activitySummary = ''

    if (action === 'add-service') {
      if (!serviceName || servicePrice === undefined) {
        return NextResponse.json({ error: 'Service name and price are required' }, { status: 400 })
      }

      const newService = {
        name: serviceName,
        price: Number(servicePrice),
        addedAt: new Date().toISOString(),
      }

      updatedBooking.additionalServices = [...(updatedBooking.additionalServices || []), newService]
      
      // Update finalPrice to include the new service
      updatedBooking.finalPrice = updatedBooking.finalPrice + newService.price
      
      activitySummary = `Added service "${serviceName}" (${servicePrice} KES) to booking for ${booking.name}`
    } else if (action === 'add-fine') {
      // Fetch fine amount from pre-appointment guidelines
      const guidelines = await readDataFile<{ fineAmount: number }>(
        'pre-appointment-guidelines.json',
        { fineAmount: 500 }
      )
      const fineAmount = guidelines.fineAmount || 500

      if (updatedBooking.fine) {
        return NextResponse.json({ error: 'Fine has already been added to this booking' }, { status: 400 })
      }

      updatedBooking.fine = {
        amount: fineAmount,
        reason: fineReason || 'Failure to follow pre-appointment guidelines (DO\'s and DON\'Ts)',
        addedAt: new Date().toISOString(),
      }

      // Update finalPrice to include the fine
      updatedBooking.finalPrice = updatedBooking.finalPrice + fineAmount
      
      activitySummary = `Added fine (${fineAmount} KES) to booking for ${booking.name}`
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update the booking in the array
    const updatedBookings = data.bookings.map((b) => (b.id === bookingId ? updatedBooking : b))
    await writeDataFile('bookings.json', { bookings: updatedBookings })

    await recordActivity({
      module: 'bookings',
      action: 'update',
      performedBy,
      summary: activitySummary,
      targetId: bookingId,
      targetType: 'booking',
      details: { action, updatedBooking },
    })

    return NextResponse.json({ success: true, booking: updatedBooking })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating booking:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

