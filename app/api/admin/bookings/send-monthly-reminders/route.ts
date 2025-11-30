import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'
import { sendEmailNotification } from '@/app/api/booking/email/utils'
import { sanitizeText, ValidationError } from '@/lib/input-validation'

interface Booking {
  id: string
  name: string
  email: string
  phone: string
  service: string
  date: string
  timeSlot: string
  location?: string
  originalPrice: number
  discount: number
  finalPrice: number
  deposit: number
  status: 'confirmed' | 'cancelled' | 'completed' | 'paid'
  manageToken?: string | null
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    // Load bookings
    const bookingsData = await readDataFile<{ bookings: Booking[] }>('bookings.json', {
      bookings: [],
    })
    const bookings = bookingsData.bookings || []

    // Filter bookings for the specified month
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0, 23, 59, 59)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    const monthEndStr = monthEnd.toISOString().split('T')[0]

    const monthBookings = bookings.filter((booking) => {
      if (booking.status === 'cancelled') return false
      const bookingDate = booking.date || booking.timeSlot?.split('T')[0]
      if (!bookingDate) return false
      return bookingDate >= monthStartStr && bookingDate <= monthEndStr
    })

    if (monthBookings.length === 0) {
      return NextResponse.json(
        { error: `No confirmed bookings found for ${monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' })}` },
        { status: 400 }
      )
    }

    // Send emails
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    }

    for (const booking of monthBookings) {
      try {
        const bookingDate = new Date(booking.timeSlot || booking.date)
        const formattedDate = bookingDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const formattedTime = bookingDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })

        // Calculate end time (assuming 2 hours for most services, adjust as needed)
        const endTime = new Date(bookingDate.getTime() + 2 * 60 * 60 * 1000)
        const formattedEndTime = endTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })

        await sendEmailNotification({
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          service: booking.service,
          date: booking.date,
          timeSlot: booking.timeSlot,
          location: booking.location || 'LashDiary Studio, Nairobi, Kenya',
          originalPrice: booking.originalPrice,
          discount: booking.discount,
          finalPrice: booking.finalPrice,
          deposit: booking.deposit,
          manageToken: booking.manageToken || undefined,
          bookingId: booking.id,
          policyWindowHours: 72,
          desiredLook: 'Classic',
          desiredLookStatus: 'recommended',
          isReminder: true,
        })

        results.sent++
      } catch (error: any) {
        results.failed++
        results.errors.push({
          email: booking.email,
          error: error.message || 'Failed to send email',
        })
        console.error(`Failed to send reminder to ${booking.email}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      total: monthBookings.length,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
      month: monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error sending monthly reminders:', error)
    return NextResponse.json({ error: 'Failed to send reminder emails' }, { status: 500 })
  }
}

