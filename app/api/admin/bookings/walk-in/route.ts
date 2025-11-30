import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { sendEmailNotification } from '@/app/api/booking/email/utils'
import { addEmailSubscriber } from '@/lib/email-subscribers-utils'
import { randomBytes } from 'crypto'

interface WalkInBookingRequest {
  name: string
  email: string
  phone: string
  service: string
  date: string
  timeSlot: string
  location?: string
  notes?: string
  originalPrice: number
  walkInFee: number
  finalPrice: number
  deposit: number
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    
    const body = await request.json()
    const {
      name,
      email,
      phone,
      service,
      date,
      timeSlot,
      location,
      notes,
      originalPrice,
      walkInFee,
      finalPrice,
      deposit,
    } = body as WalkInBookingRequest

    // Validate required fields
    if (!name || !email || !phone || !service || !date || !timeSlot) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate time slot is available
    const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const existingBookings = bookingsData.bookings || []
    const conflictingBooking = existingBookings.find(
      (b) => b.date === date && b.timeSlot === timeSlot && b.status !== 'cancelled'
    )

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'This time slot is already booked' },
        { status: 400 }
      )
    }

    const bookingId = `walk-in-${randomBytes(16).toString('hex')}`
    const manageToken = randomBytes(32).toString('hex')
    const createdAt = new Date().toISOString()

    const newBooking = {
      id: bookingId,
      name,
      email,
      phone,
      service,
      services: [service],
      date,
      timeSlot,
      location: location || 'LashDiary Studio, Nairobi, Kenya',
      notes: notes || '',
      originalPrice,
      discount: 0,
      finalPrice,
      deposit: 0, // Walk-ins pay after appointment, no deposit required
      discountType: null,
      promoCode: null,
      referralType: null,
      salonReferral: null,
      mpesaCheckoutRequestID: null,
      createdAt,
      status: 'confirmed' as const,
      isWalkIn: true,
      walkInFee,
      testimonialRequested: false,
      calendarEventId: null,
      manageToken,
      manageTokenGeneratedAt: createdAt,
    }

    // Save booking
    const updatedBookings = [...existingBookings, newBooking]
    await writeDataFile('bookings.json', { bookings: updatedBookings })

    // Add client to email contacts
    try {
      const added = await addEmailSubscriber(email, name)
      if (added) {
        console.log(`Added ${email} to email subscribers`)
      } else {
        console.log(`${email} already exists in email subscribers`)
      }
    } catch (subscriberError) {
      console.error('Error adding email subscriber:', subscriberError)
      // Don't fail the booking if adding to subscribers fails
    }

    // Send email notification to client
    try {
      console.log(`[Walk-In] Attempting to send email to ${email} for booking ${bookingId}`)
      console.log(`[Walk-In] Email details:`, {
        name,
        email,
        service,
        date,
        timeSlot,
        finalPrice,
        deposit,
        walkInFee,
        isWalkIn: true,
      })
      
      const emailResult = await sendEmailNotification({
        name,
        email,
        phone,
        service,
        date,
        timeSlot,
        location: location || 'LashDiary Studio, Nairobi, Kenya',
        isFirstTimeClient: false,
        originalPrice,
        discount: 0,
        finalPrice,
        deposit,
        bookingId,
        manageToken,
        policyWindowHours: 72,
        notes: notes || undefined,
        desiredLook: 'Custom',
        desiredLookStatus: 'custom',
        isWalkIn: true,
        walkInFee,
      })
      
      console.log(`[Walk-In] Email result:`, JSON.stringify(emailResult, null, 2))
      
      if (emailResult?.success) {
        if (emailResult.customerEmailSent) {
          console.log(`✅ [Walk-In] Customer email sent successfully to ${email}. Message ID: ${emailResult.customerEmailId}`)
        } else {
          console.warn(`⚠️ [Walk-In] Email function returned success but customer email was not sent. Status: ${emailResult.status}`)
          if (emailResult.customerEmailError) {
            console.error(`[Walk-In] Customer email error:`, emailResult.customerEmailError)
          }
        }
        if (emailResult.ownerEmailSent) {
          console.log(`✅ [Walk-In] Owner notification email sent. Message ID: ${emailResult.ownerEmailId}`)
        }
      } else {
        console.error(`❌ [Walk-In] Email failed to send:`, emailResult?.error || 'Unknown error')
        if (emailResult?.details) {
          console.error(`[Walk-In] Error details:`, emailResult.details)
        }
      }
    } catch (emailError: any) {
      console.error('[Walk-In] Exception sending email notification:', emailError)
      console.error('[Walk-In] Error stack:', emailError?.stack)
      // Don't fail the booking if email fails
    }

    // Record activity
    await recordActivity({
      module: 'bookings',
      action: 'create',
      performedBy,
      summary: `Created walk-in booking for ${name}`,
      targetId: bookingId,
      targetType: 'booking',
      details: { isWalkIn: true, walkInFee },
    })

    return NextResponse.json({ success: true, booking: newBooking })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating walk-in booking:', error)
    return NextResponse.json({ error: 'Failed to create walk-in booking' }, { status: 500 })
  }
}

