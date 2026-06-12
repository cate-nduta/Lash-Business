import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { getCalendarClientWithWrite } from '@/lib/google-calendar-client'
import { sendEmailNotification } from '@/app/api/booking/email/utils'
// Import the function directly - it's not exported, so we'll duplicate the logic
import { updateFullyBookedState } from '@/lib/availability-utils'
import { getSalonCommissionSettings } from '@/lib/discount-utils'
import { redeemGiftCard } from '@/lib/gift-card-utils'
import { redeemPromoCodeForBooking } from '@/lib/promo-redemption-utils'
import {
  getBookingDurationMinutes,
  hasAppointmentConflict,
  loadBookingBusyIntervals,
  loadModelApplicationBusyIntervals,
} from '@/lib/model-application-settings'
import { randomBytes } from 'crypto'
import { type ClientData, type ClientUsersData, type LashHistory } from '@/types/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'
const CALENDAR_EMAIL = process.env.GOOGLE_CALENDAR_EMAIL || 'hello@lashdiary.co.ke'
const STUDIO_LOCATION = process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'
const CLIENT_MANAGE_WINDOW_HOURS = Math.max(Number(process.env.CLIENT_MANAGE_WINDOW_HOURS || 72) || 72, 1)

/**
 * Create booking from pending booking data after payment is confirmed
 * This is called by the webhook after payment is verified
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingReference, paymentReference } = body

    if (!bookingReference || !paymentReference) {
      return NextResponse.json(
        { error: 'Booking reference and payment reference are required' },
        { status: 400 }
      )
    }

    const existingBookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const existingBooking = (existingBookingsData.bookings || []).find(
      (booking) =>
        booking?.bookingReference === bookingReference ||
        booking?.paymentOrderTrackingId === paymentReference ||
        booking?.paymentTransactionId === paymentReference,
    )

    if (existingBooking) {
      return NextResponse.json({
        success: true,
        bookingId: existingBooking.bookingId || existingBooking.id,
        alreadyCreated: true,
        message: 'Booking already exists for this payment',
      })
    }

    // Load pending booking data
    const pendingBookings = await readDataFile<Array<{
      bookingReference: string
      bookingData: any
      createdAt: string
      expiresAt?: string
    }>>('pending-bookings.json', [])

    const pendingBooking = pendingBookings.find(pb => pb.bookingReference === bookingReference)

    if (!pendingBooking) {
      return NextResponse.json(
        { error: 'Pending booking not found' },
        { status: 404 }
      )
    }

    const pendingExpiry = pendingBooking.expiresAt ? new Date(pendingBooking.expiresAt).getTime() : null
    if (pendingExpiry !== null && (!Number.isFinite(pendingExpiry) || pendingExpiry <= Date.now())) {
      const updatedPending = pendingBookings.filter(pb => pb.bookingReference !== bookingReference)
      await writeDataFile('pending-bookings.json', updatedPending)

      const reservations = await readDataFile<Array<{
        bookingReference: string
        date: string
        timeSlot: string
      }>>('pending-booking-reservations.json', [])
      const updatedReservations = reservations.filter(r => r.bookingReference !== bookingReference)
      await writeDataFile('pending-booking-reservations.json', updatedReservations)

      return NextResponse.json(
        { error: 'This deposit link has expired and the slot has been released. Please reserve the slot again.' },
        { status: 410 }
      )
    }

    const bookingData = pendingBooking.bookingData

    // Now create the actual booking
    const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const manageToken = randomBytes(24).toString('hex')
    const createdAt = new Date().toISOString()
    const salonCommissionSettings = await getSalonCommissionSettings()
    const startTime = new Date(bookingData.timeSlot)
    const durationMinutes = getBookingDurationMinutes(bookingData)
    const cancellationCutoff = new Date(startTime.getTime() - CLIENT_MANAGE_WINDOW_HOURS * 60 * 60 * 1000)

    const [bookingBusyIntervals, modelBusyIntervals] = await Promise.all([
      loadBookingBusyIntervals({ excludeBookingReference: bookingReference }),
      loadModelApplicationBusyIntervals(),
    ])
    if (hasAppointmentConflict(startTime, durationMinutes, [...bookingBusyIntervals, ...modelBusyIntervals])) {
      return NextResponse.json(
        { error: 'This time slot overlaps with an existing booking or model appointment. Please select another time.' },
        { status: 409 }
      )
    }

    // Create calendar event if configured
    let eventId = null
    try {
      const calendar = await getCalendarClientWithWrite()
      if (calendar) {
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + durationMinutes)

        const event = {
          summary: `Lash Appointment - ${bookingData.name}`,
          description: `
            Client: ${bookingData.name}
            Email: ${bookingData.email}
            Phone: ${bookingData.phone}
            Service: ${bookingData.service}
            Location: ${bookingData.location || STUDIO_LOCATION}
            Deposit: KSH ${bookingData.deposit || 0}
          `,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'Africa/Nairobi',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'Africa/Nairobi',
          },
          attendees: [
            { email: CALENDAR_EMAIL },
            { email: bookingData.email },
          ],
        }

        // Service accounts cannot use sendUpdates without Domain-Wide Delegation
        // Email notifications are handled separately via the email service
        const response = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: event,
          // Removed sendUpdates: 'all' - service accounts can't send invitations
        })

        eventId = response.data.id
      }
    } catch (calendarError) {
      console.error('Error creating calendar event:', calendarError)
    }

    // Redeem gift card if provided
    let giftCardRedeemed = false
    let giftCardRemainingBalance = 0
    if (bookingData.giftCardCode && bookingData.deposit > 0) {
      try {
        const redeemResult = await redeemGiftCard(
          bookingData.giftCardCode,
          bookingData.deposit,
          bookingId,
          bookingData.email
        )
        if (redeemResult.success) {
          giftCardRedeemed = true
          giftCardRemainingBalance = redeemResult.remainingBalance || 0
        }
      } catch (error) {
        console.error('Error redeeming gift card:', error)
      }
    }

    // Create the actual booking
    const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const bookings = bookingsData.bookings || []
    const duplicateBooking = bookings.find(
      (booking) =>
        booking?.bookingReference === bookingReference ||
        booking?.paymentOrderTrackingId === paymentReference ||
        booking?.paymentTransactionId === paymentReference,
    )

    if (duplicateBooking) {
      const updatedPending = pendingBookings.filter(pb => pb.bookingReference !== bookingReference)
      await writeDataFile('pending-bookings.json', updatedPending)

      return NextResponse.json({
        success: true,
        bookingId: duplicateBooking.bookingId || duplicateBooking.id,
        alreadyCreated: true,
        message: 'Booking already exists for this payment',
      })
    }

    const originalServicePrice = Number(bookingData.originalPrice || bookingData.finalPrice || 0)
    const salonCommissionTotal = Math.round(
      originalServicePrice * (salonCommissionSettings.totalPercentage / 100),
    )

    const newBooking = {
      id: bookingId,
      bookingId,
      bookingReference,
      name: bookingData.name,
      email: bookingData.email,
      phone: bookingData.phone,
      service: bookingData.service,
      services: bookingData.services || [],
      serviceDetails: bookingData.serviceDetails || null,
      totalDuration: bookingData.totalDuration ?? durationMinutes / 60,
      totalDurationMinutes: durationMinutes,
      date: bookingData.date,
      timeSlot: bookingData.timeSlot,
      location: bookingData.location || STUDIO_LOCATION,
      visitType: bookingData.visitType || 'studio',
      homeCallLocationId: bookingData.homeCallLocationId ?? null,
      homeCallLocationName: bookingData.homeCallLocationName ?? null,
      residentialArea: bookingData.residentialArea ?? null,
      homeAddressDetails: bookingData.homeAddressDetails ?? null,
      serviceSubtotal: bookingData.serviceSubtotal ?? null,
      homeVisitFee: bookingData.homeVisitFee ?? null,
      originalPrice: bookingData.originalPrice || 0,
      discount: bookingData.discount || 0,
      finalPrice: bookingData.finalPrice || 0,
      deposit: bookingData.deposit || 0,
      paymentMethod: 'paystack',
      paymentStatus: 'paid', // Payment is confirmed
      paymentOrderTrackingId: paymentReference,
      paymentTransactionId: paymentReference,
      paidAt: new Date().toISOString(),
      discountType: bookingData.discountType || null,
      promoCode: bookingData.promoCode || null,
      referralType: bookingData.referralType || null,
      clientReferralDetails: bookingData.clientReferral || bookingData.clientReferralDetails || null,
      promoCodeRedeemedAt: null as string | null,
      status: 'confirmed', // Only confirmed after payment
      calendarEventId: eventId,
      createdAt,
      manageToken,
      // ... other booking fields
    }

    const promoRedemptionResult = await redeemPromoCodeForBooking(newBooking)
    if ('success' in promoRedemptionResult && promoRedemptionResult.success) {
      newBooking.promoCodeRedeemedAt = new Date().toISOString()
    }

    bookings.push(newBooking)
    await writeDataFile('bookings.json', { bookings })

    // Remove from pending bookings
    const updatedPending = pendingBookings.filter(pb => pb.bookingReference !== bookingReference)
    await writeDataFile('pending-bookings.json', updatedPending)

    // Remove reservation
    const reservations = await readDataFile<Array<{
      bookingReference: string
      date: string
      timeSlot: string
    }>>('pending-booking-reservations.json', [])
    const updatedReservations = reservations.filter(r => r.bookingReference !== bookingReference)
    await writeDataFile('pending-booking-reservations.json', updatedReservations)

    // Send booking confirmation email automatically after payment is confirmed
    let emailSent = false
    let emailError = null
    try {
      const emailResult = await sendEmailNotification({
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        service: bookingData.service || '',
        date: bookingData.date,
        timeSlot: bookingData.timeSlot,
        location: bookingData.location || STUDIO_LOCATION,
        originalPrice: bookingData.originalPrice || 0,
        discount: bookingData.discount || 0,
        finalPrice: bookingData.finalPrice || 0,
        deposit: bookingData.deposit || 0,
        bookingId,
        manageToken,
        policyWindowHours: CLIENT_MANAGE_WINDOW_HOURS,
        notes: bookingData.notes,
        appointmentPreference: bookingData.appointmentPreference,
        desiredLook: bookingData.desiredLook || 'Custom',
        desiredLookStatus: bookingData.desiredLookStatus || 'custom',
        isGiftCardBooking: !!bookingData.giftCardCode,
      })

      if (emailResult && emailResult.success && emailResult.ownerEmailSent) {
        emailSent = true
        console.log('✅ Booking confirmation email sent automatically after payment:', {
          bookingId,
          email: bookingData.email,
          ownerEmailSent: emailResult.ownerEmailSent,
          customerEmailSent: emailResult.customerEmailSent,
        })
      } else {
        emailError = emailResult?.error || 'Email service unavailable'
        console.warn('⚠️ Booking confirmation email not sent:', emailError)
      }
    } catch (emailErr: any) {
      emailError = emailErr.message || 'Email service error'
      console.error('❌ Error sending booking confirmation email:', emailErr)
      // Don't fail the booking creation if email fails
    }

    // Create/update client account
    try {
      const normalizedEmail = bookingData.email.toLowerCase().trim()
      const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
      
      let user = usersData.users.find(u => u.email.toLowerCase().trim() === normalizedEmail)
      
      if (!user) {
        const userId = randomBytes(16).toString('hex')
        const now = new Date().toISOString()
        
        user = {
          id: userId,
          email: normalizedEmail,
          name: bookingData.name,
          phone: bookingData.phone,
          passwordHash: '',
          createdAt: now,
          isActive: true,
          emailVerified: false,
        }
        
        usersData.users.push(user)
        await writeDataFile('users.json', usersData)
        
        const clientData: ClientData = {
          profile: user,
          lashHistory: [],
          preferences: {
            preferredCurl: null,
            lengthRange: null,
            densityLevel: null,
            eyeShape: null,
            mappingStyle: null,
            signatureLook: null,
          },
          allergies: { hasReaction: false },
          aftercare: {},
          lashMaps: [],
          retentionCycles: [],
        }
        
        await writeDataFile(`client-${userId}.json`, clientData)
      }
      
      // Add to lash history
      const clientDataFile = `client-${user.id}.json`
      const clientData = await readDataFile<ClientData>(clientDataFile, undefined)
      
      if (clientData) {
        const lashHistoryEntry: LashHistory = {
          appointmentId: bookingId,
          date: bookingData.date,
          service: bookingData.service,
          serviceType: 'full-set',
          lashTech: 'Lash Technician',
        }
        
        clientData.lashHistory.push(lashHistoryEntry)
        await writeDataFile(clientDataFile, clientData)
      }
    } catch (clientError) {
      console.error('Error creating client account:', clientError)
    }

    return NextResponse.json({
      success: true,
      bookingId,
      emailSent,
      emailError,
      message: 'Booking created successfully after payment confirmation',
    })
  } catch (error: any) {
    console.error('Error creating booking from payment:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}

