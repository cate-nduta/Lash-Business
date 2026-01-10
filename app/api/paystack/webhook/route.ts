import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, verifyTransaction, convertFromSubunits } from '@/lib/paystack-utils'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho, BUSINESS_NOTIFICATION_EMAIL } from '@/lib/email/zoho-config'
import { getCalendarClientWithWrite } from '@/lib/google-calendar-client'
import { sendEmailNotification } from '@/app/api/booking/email/utils'
import { updateFullyBookedState } from '@/lib/availability-utils'
import { getSalonCommissionSettings } from '@/lib/discount-utils'
import { redeemGiftCard } from '@/lib/gift-card-utils'
import { randomBytes } from 'crypto'
import { type ClientData, type ClientUsersData, type LashHistory } from '@/types/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Paystack webhook handler
 * POST /api/paystack/webhook
 * 
 * Handles events from Paystack:
 * - charge.success: Payment was successful
 * - charge.failed: Payment failed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid Paystack webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)
    console.log('📥 Paystack webhook event received:', {
      event: event.event,
      reference: event.data?.reference,
      metadata: event.data?.metadata,
    })

    // Handle different event types
    if (event.event === 'charge.success') {
      const transaction = event.data

      // Verify the transaction to ensure it's legitimate
      const verification = await verifyTransaction(transaction.reference)
      
      if (!verification.success || verification.transaction?.status !== 'success') {
        console.error('Transaction verification failed for webhook:', transaction.reference)
        // Still return 200 to prevent Paystack from retrying
        return NextResponse.json({ received: true })
      }

      const verifiedTransaction = verification.transaction!

      // Extract metadata to determine what type of payment this is
      const metadata = transaction.metadata || {}
      const paymentType = metadata.payment_type || 'unknown'
      const paymentId = metadata.payment_id || metadata.purchase_id || metadata.invoice_id

      console.log('Processing successful payment:', {
        reference: verifiedTransaction.reference,
        amount: verifiedTransaction.amount,
        currency: verifiedTransaction.currency,
        paymentType,
        paymentId,
      })

      // Handle different payment types
      console.log('🔄 Processing payment type:', paymentType, 'for reference:', verifiedTransaction.reference)
      
      switch (paymentType) {
        case 'course_purchase':
          await handleCoursePurchasePayment(verifiedTransaction, metadata)
          break

        case 'consultation':
          console.log('📋 Handling consultation payment:', {
            consultationId: metadata.consultation_id,
            reference: verifiedTransaction.reference,
          })
          await handleConsultationPayment(verifiedTransaction, metadata)
          break

        case 'invoice':
          await handleInvoicePayment(verifiedTransaction, metadata)
          break

        case 'gift_card':
          await handleGiftCardPayment(verifiedTransaction, metadata)
          break

        case 'booking':
          await handleBookingPayment(verifiedTransaction, metadata)
          break

        case 'booking_balance':
          await handleBookingBalancePayment(verifiedTransaction, metadata)
          break

        case 'labs_web_services':
          await handleLabsWebServicesPayment(verifiedTransaction, metadata)
          break

        case 'labs_tier':
          await handleLabsTierPayment(verifiedTransaction, metadata)
          break

        case 'labs_yearly_subscription':
          await handleLabsYearlySubscriptionPayment(verifiedTransaction, metadata)
          break

        default:
          console.warn('Unknown payment type:', paymentType)
      }

      // Send notification to admin
      await sendEmailViaZoho({
        to: BUSINESS_NOTIFICATION_EMAIL,
        subject: `Payment Successful: ${verifiedTransaction.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background: #FDF9F4; color: #2F1A16;">
            <h2 style="color: #7C4B31;">Payment Received</h2>
            <p><strong>Reference:</strong> ${verifiedTransaction.reference}</p>
            <p><strong>Amount:</strong> ${verifiedTransaction.currency} ${verifiedTransaction.amount.toLocaleString()}</p>
            <p><strong>Customer:</strong> ${verifiedTransaction.customer?.email || 'N/A'}</p>
            <p><strong>Payment Type:</strong> ${paymentType}</p>
            <p><strong>Paid At:</strong> ${verifiedTransaction.paidAt || 'N/A'}</p>
          </div>
        `,
      })
    } else if (event.event === 'charge.failed') {
      const transaction = event.data
      console.log('Payment failed:', transaction.reference)
      
      // You can handle failed payments here if needed
      // e.g., send notification, update records, etc.
    }

    // Always return 200 OK to Paystack
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing Paystack webhook:', error)
    // Still return 200 to prevent Paystack from retrying
    return NextResponse.json({ received: true })
  }
}

/**
 * Handle course purchase payment
 */
async function handleCoursePurchasePayment(transaction: any, metadata: any) {
  try {
    const purchaseId = metadata.purchase_id
    if (!purchaseId) return

    const purchases = await readDataFile<{ purchases: any[] }>('course-purchases.json', { purchases: [] })
    const purchase = purchases.purchases.find(p => p.id === purchaseId)

    if (!purchase) {
      console.error('Course purchase not found:', purchaseId)
      return
    }

    // Update purchase status
    purchase.paymentStatus = 'paid'
    purchase.transactionId = transaction.reference
    purchase.paidAt = transaction.paidAt || new Date().toISOString()
    purchase.accessGranted = true

    const purchaseIndex = purchases.purchases.findIndex(p => p.id === purchaseId)
    if (purchaseIndex !== -1) {
      purchases.purchases[purchaseIndex] = purchase
      await writeDataFile('course-purchases.json', purchases)
    }

    // TODO: Send course access email with login credentials
    console.log('Course purchase payment processed:', purchaseId)
  } catch (error) {
    console.error('Error handling course purchase payment:', error)
  }
}

/**
 * Handle consultation payment
 */
async function handleConsultationPayment(transaction: any, metadata: any) {
  try {
    const consultationId = metadata.consultation_id
    if (!consultationId) {
      console.warn('⚠️ No consultation_id in payment metadata:', metadata)
      return
    }
    
    console.log('🔍 Processing consultation payment:', {
      consultationId,
      reference: transaction.reference,
      amount: transaction.amount,
    })

    // Check if consultation already exists (legacy support)
    const consultations = await readDataFile<{ consultations: any[] }>('labs-consultations.json', { consultations: [] })
    const existingConsultation = consultations.consultations.find(c => c.consultationId === consultationId)
    
    console.log('📋 Consultation lookup:', {
      foundInMain: !!existingConsultation,
      totalConsultations: consultations.consultations.length,
    })

    if (existingConsultation) {
      // Update existing consultation payment status (legacy)
      existingConsultation.paymentStatus = 'paid'
      existingConsultation.status = 'confirmed'
      existingConsultation.paidAt = transaction.paidAt || new Date().toISOString()
      existingConsultation.paymentTransactionId = transaction.reference

      const consultationIndex = consultations.consultations.findIndex(c => c.consultationId === consultationId)
      if (consultationIndex !== -1) {
        consultations.consultations[consultationIndex] = existingConsultation
        await writeDataFile('labs-consultations.json', consultations)
      }

      // Send consultation confirmation email (ONLY after payment is confirmed)
      try {
        const { sendConsultationEmail } = await import('@/app/api/labs/consultation/email-utils')
        console.log('Attempting to send consultation confirmation email for:', consultationId, {
          email: existingConsultation.email,
          preferredDate: existingConsultation.preferredDate,
          preferredTime: existingConsultation.preferredTime,
          paymentStatus: existingConsultation.paymentStatus,
        })
        await sendConsultationEmail(existingConsultation)
        console.log('✅ Consultation confirmation email sent successfully:', consultationId, 'to:', existingConsultation.email)
      } catch (emailError: any) {
        console.error('❌ Error sending consultation confirmation email:', {
          consultationId,
          error: emailError?.message || emailError,
          stack: emailError?.stack,
          email: existingConsultation.email,
        })
        // Don't fail the webhook if email fails, but log it for debugging
      }

      console.log('Consultation payment processed (existing consultation):', consultationId)
      return
    }

    // Check for pending consultation data - create consultation from pending data
    try {
      const pendingConsultations = await readDataFile<Array<{
        consultationId: string
        consultationData: any
        createdAt: string
      }>>('pending-consultations.json', [])

      const pendingConsultation = pendingConsultations.find(pc => pc.consultationId === consultationId)

      if (pendingConsultation) {
        // Create the actual consultation now that payment is confirmed
        const consultationData = {
          ...pendingConsultation.consultationData,
          paymentStatus: 'paid',
          status: 'confirmed',
          paidAt: transaction.paidAt || new Date().toISOString(),
          paymentTransactionId: transaction.reference,
        }

        consultations.consultations.push(consultationData)
        await writeDataFile('labs-consultations.json', consultations)

        // Remove from pending consultations
        const updatedPending = pendingConsultations.filter(pc => pc.consultationId !== consultationId)
        await writeDataFile('pending-consultations.json', updatedPending)

        // Send consultation confirmation email (ONLY after payment is confirmed)
        try {
          const { sendConsultationEmail } = await import('@/app/api/labs/consultation/email-utils')
          console.log('Attempting to send consultation confirmation email for:', consultationId, {
            email: consultationData.email,
            preferredDate: consultationData.preferredDate,
            preferredTime: consultationData.preferredTime,
            paymentStatus: consultationData.paymentStatus,
          })
          await sendConsultationEmail(consultationData)
          console.log('✅ Consultation confirmation email sent successfully:', consultationId, 'to:', consultationData.email)
        } catch (emailError: any) {
          console.error('❌ Error sending consultation confirmation email:', {
            consultationId,
            error: emailError?.message || emailError,
            stack: emailError?.stack,
            email: consultationData.email,
          })
          // Don't fail the webhook if email fails, but log it for debugging
        }

        console.log('Consultation created from pending data after payment confirmation:', consultationId)
        return
      }
    } catch (error) {
      console.warn('Error checking pending consultations:', error)
    }

    console.log('No pending consultation found for ID:', consultationId)
  } catch (error) {
    console.error('Error handling consultation payment:', error)
  }
}

/**
 * Handle invoice payment
 */
async function handleInvoicePayment(transaction: any, metadata: any) {
  try {
    const invoiceId = metadata.invoice_id
    if (!invoiceId) return

    const invoices = await readDataFile<any[]>('labs-invoices.json', [])
    const invoice = invoices.find(i => i.invoiceId === invoiceId)

    if (!invoice) {
      console.error('Invoice not found:', invoiceId)
      return
    }

    // Update invoice status
    invoice.status = 'paid'
    invoice.paidAt = transaction.paidAt || new Date().toISOString()
    invoice.paymentMethod = 'paystack'
    invoice.transactionId = transaction.reference

    const invoiceIndex = invoices.findIndex(i => i.invoiceId === invoiceId)
    if (invoiceIndex !== -1) {
      invoices[invoiceIndex] = invoice
      await writeDataFile('labs-invoices.json', invoices)
    }

    console.log('Invoice payment processed:', invoiceId)
  } catch (error) {
    console.error('Error handling invoice payment:', error)
  }
}

/**
 * Handle gift card payment
 */
async function handleGiftCardPayment(transaction: any, metadata: any) {
  try {
    const giftCardId = metadata.gift_card_id
    if (!giftCardId) return

    // TODO: Implement gift card creation after payment
    console.log('Gift card payment processed:', giftCardId)
  } catch (error) {
    console.error('Error handling gift card payment:', error)
  }
}

/**
 * Handle booking payment
 * Creates the actual booking ONLY after payment is confirmed
 */
async function handleBookingPayment(transaction: any, metadata: any) {
  try {
    const bookingReference = metadata.booking_reference
    if (!bookingReference) {
      console.warn('No booking reference in payment metadata')
      return
    }

    // Check if booking already exists (legacy support)
    try {
      const bookings = await readDataFile<any[]>('bookings.json', [])
      const existingBooking = bookings.find(b => 
        b && (
          b.bookingReference === bookingReference || 
          b.paymentOrderTrackingId === transaction.reference ||
          b.pesapalOrderTrackingId === transaction.reference
        )
      )

      if (existingBooking) {
        // Update existing booking payment status (legacy)
        const wasNotPaid = existingBooking.paymentStatus !== 'paid'
        existingBooking.paymentStatus = 'paid'
        existingBooking.paymentMethod = 'paystack'
        existingBooking.paymentTransactionId = transaction.reference
        existingBooking.paidAt = transaction.paidAt || new Date().toISOString()
        existingBooking.status = 'confirmed' // Ensure it's confirmed

        const bookingIndex = bookings.findIndex(b => b.bookingId === existingBooking.bookingId)
        if (bookingIndex !== -1) {
          bookings[bookingIndex] = existingBooking
          await writeDataFile('bookings.json', bookings)
        }

        // Send confirmation email if booking was just paid (not already paid)
        if (wasNotPaid && existingBooking.email) {
          try {
            const { sendEmailNotification } = await import('@/app/api/booking/email/utils')
            const emailResult = await sendEmailNotification({
              name: existingBooking.name,
              email: existingBooking.email,
              phone: existingBooking.phone,
              service: existingBooking.service || '',
              date: existingBooking.date,
              timeSlot: existingBooking.timeSlot,
              location: existingBooking.location || process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya',
              originalPrice: existingBooking.originalPrice || 0,
              discount: existingBooking.discount || 0,
              finalPrice: existingBooking.finalPrice || 0,
              deposit: existingBooking.deposit || 0,
              bookingId: existingBooking.bookingId,
              manageToken: existingBooking.manageToken,
              policyWindowHours: existingBooking.cancellationWindowHours || 72,
              notes: existingBooking.notes,
              appointmentPreference: existingBooking.appointmentPreference,
              desiredLook: existingBooking.desiredLook || 'Custom',
              desiredLookStatus: existingBooking.desiredLookStatus || 'custom',
              isGiftCardBooking: !!existingBooking.giftCardCode,
            })

            if (emailResult && emailResult.success) {
              console.log('✅ Booking confirmation email sent via webhook:', {
                bookingId: existingBooking.bookingId,
                email: existingBooking.email,
              })
            } else {
              console.warn('⚠️ Failed to send booking confirmation email:', emailResult?.error)
            }
          } catch (emailError) {
            console.error('❌ Error sending booking confirmation email via webhook:', emailError)
            // Don't fail the webhook if email fails
          }
        }

        console.log('Booking payment processed (existing booking):', bookingReference, existingBooking.bookingId)
        return
      }
    } catch (error) {
      console.warn('Error reading bookings.json:', error)
    }

    // Check for pending booking data - create booking from pending data
    try {
      const pendingBookings = await readDataFile<Array<{
        bookingReference: string
        bookingData: any
        createdAt: string
      }>>('pending-bookings.json', [])

      const pendingBooking = pendingBookings.find(pb => pb.bookingReference === bookingReference)

      if (pendingBooking) {
        // Create the actual booking directly in webhook (no fetch needed)
        console.log('📝 Processing pending booking:', bookingReference)
        await createBookingDirectlyInWebhook(pendingBooking.bookingData, bookingReference, transaction)
        return
      }
    } catch (error) {
      console.warn('Error checking pending bookings:', error)
    }

    console.log('No pending booking found for reference:', bookingReference)
  } catch (error) {
    console.error('Error handling booking payment:', error)
  }
}

/**
 * Create booking directly in webhook (fallback when fetch fails)
 */
async function createBookingDirectlyInWebhook(bookingData: any, bookingReference: string, transaction: any) {
  try {
    console.log('📝 Creating booking directly in webhook:', bookingReference)
    const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const manageToken = randomBytes(24).toString('hex')
    const createdAt = new Date().toISOString()
    const salonCommissionSettings = await getSalonCommissionSettings()
    const CLIENT_MANAGE_WINDOW_HOURS = Math.max(Number(process.env.CLIENT_MANAGE_WINDOW_HOURS || 72) || 72, 1)
    const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'
    const CALENDAR_EMAIL = process.env.GOOGLE_CALENDAR_EMAIL || 'hello@lashdiary.co.ke'
    const STUDIO_LOCATION = process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'
    
    const startTime = new Date(bookingData.timeSlot)
    const cancellationCutoff = new Date(startTime.getTime() - CLIENT_MANAGE_WINDOW_HOURS * 60 * 60 * 1000)

    // Create calendar event if configured
    let eventId = null
    try {
      const calendar = await getCalendarClientWithWrite()
      if (calendar) {
        const endTime = new Date(startTime)
        endTime.setHours(endTime.getHours() + (bookingData.totalDuration || 2))

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

        const response = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: event,
        })

        eventId = response.data.id
        console.log('✅ Calendar event created:', eventId)
      }
    } catch (calendarError: any) {
      console.error('⚠️ Error creating calendar event:', calendarError?.message || calendarError)
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
      service: bookingData.service || '',
      services: bookingData.services || [],
      serviceDetails: bookingData.serviceDetails || null,
      date: bookingData.date,
      timeSlot: bookingData.timeSlot,
      location: bookingData.location || STUDIO_LOCATION,
      originalPrice: bookingData.originalPrice || 0,
      discount: bookingData.discount || 0,
      finalPrice: bookingData.finalPrice || 0,
      deposit: bookingData.deposit || 0,
      paymentMethod: 'paystack',
      paymentStatus: 'paid',
      paymentOrderTrackingId: transaction.reference,
      paymentTransactionId: transaction.reference,
      paidAt: transaction.paidAt || new Date().toISOString(),
      status: 'confirmed',
      calendarEventId: eventId,
      createdAt,
      manageToken,
      manageTokenGeneratedAt: createdAt,
      manageTokenLastUsedAt: null,
      cancellationWindowHours: CLIENT_MANAGE_WINDOW_HOURS,
      cancellationCutoffAt: cancellationCutoff.toISOString(),
      lastClientManageActionAt: null,
      clientManageDisabled: false,
      testimonialRequested: false,
      testimonialRequestedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      refundStatus: 'not_applicable',
      refundAmount: 0,
      refundNotes: null,
      rescheduledAt: null,
      rescheduledBy: null,
      rescheduleHistory: [],
      giftCardCode: bookingData.giftCardCode || null,
      giftCardRedeemed: giftCardRedeemed || false,
      giftCardRemainingBalance: giftCardRemainingBalance || 0,
      notes: bookingData.notes || '',
      appointmentPreference: bookingData.appointmentPreference || '',
      desiredLook: bookingData.desiredLook || 'Custom',
      desiredLookStatus: bookingData.desiredLookStatus || 'custom',
      lastFullSetDate: bookingData.lastFullSetDate || null,
      promoCode: bookingData.promoCode || null,
      discountType: bookingData.discountType || null,
      salonReferral: bookingData.salonReferral || null,
      isFirstTimeClient: bookingData.isFirstTimeClient || false,
    }

    bookings.push(newBooking)
    await writeDataFile('bookings.json', { bookings })
    console.log('✅ Booking created in bookings.json:', bookingId)

    // Remove from pending bookings
    const pendingBookings = await readDataFile<Array<{
      bookingReference: string
      bookingData: any
      createdAt: string
    }>>('pending-bookings.json', [])
    const updatedPending = pendingBookings.filter(pb => pb.bookingReference !== bookingReference)
    await writeDataFile('pending-bookings.json', updatedPending)
    console.log('✅ Removed from pending bookings')

    // Remove reservation
    const reservations = await readDataFile<Array<{
      bookingReference: string
      date: string
      timeSlot: string
    }>>('pending-booking-reservations.json', [])
    const updatedReservations = reservations.filter(r => r.bookingReference !== bookingReference)
    await writeDataFile('pending-booking-reservations.json', updatedReservations)
    console.log('✅ Removed from pending reservations')

    // Update fully booked state
    try {
      await updateFullyBookedState(bookingData.date, bookings, {
        onDayFullyBooked: async (dateStr: string) => {
          console.log('📅 Date fully booked:', dateStr)
        },
      })
    } catch (stateError) {
      console.error('Error updating fully booked state:', stateError)
    }

    // Send booking confirmation email
    let emailSent = false
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
        console.log('✅ Booking confirmation emails sent:', {
          bookingId,
          email: bookingData.email,
          ownerEmailSent: emailResult.ownerEmailSent,
          customerEmailSent: emailResult.customerEmailSent,
        })
      } else {
        console.warn('⚠️ Booking confirmation email not sent:', emailResult?.error)
      }
    } catch (emailErr: any) {
      console.error('❌ Error sending booking confirmation email:', emailErr)
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
          service: bookingData.service || '',
          serviceType: 'full-set',
          lashTech: 'Lash Technician',
        }
        
        clientData.lashHistory.push(lashHistoryEntry)
        await writeDataFile(clientDataFile, clientData)
      }
    } catch (clientError) {
      console.error('Error creating client account:', clientError)
    }

    console.log('✅ Booking creation completed in webhook:', {
      bookingId,
      bookingReference,
      emailSent,
    })
  } catch (error: any) {
    console.error('❌ Error creating booking directly in webhook:', {
      error: error.message || error,
      stack: error.stack,
      bookingReference,
    })
  }
}

/**
 * Handle labs web services payment
 */
async function handleLabsWebServicesPayment(transaction: any, metadata: any) {
  try {
    const orderId = metadata.order_id
    if (!orderId) {
      console.warn('No order_id in labs web services payment metadata')
      return
    }

    const orders = await readDataFile<any[]>('labs-web-services-orders.json', [])
    const order = orders.find((o) => o.id === orderId)

    if (!order) {
      console.error('Labs web services order not found:', orderId)
      return
    }

    // Update payment status
    const amountPaid = transaction.amount / 100 // Paystack amounts are in subunits
    const wasPartial = order.paymentStatus === 'partial'
    
    if (order.remainingPayment > 0 && amountPaid >= order.remainingPayment) {
      // Final payment completed
      order.paymentStatus = 'completed'
      order.remainingPayment = 0
      order.status = 'in_progress'
    } else if (order.remainingPayment === 0 && !wasPartial) {
      // Initial payment completed
      order.paymentStatus = 'partial'
      order.status = 'pending'
    }

    // Add payment record
    if (!order.payments) {
      order.payments = []
    }
    order.payments.push({
      amount: amountPaid,
      method: 'paystack',
      date: transaction.paidAt || new Date().toISOString(),
      transactionId: transaction.reference,
    })

    // Update order
    const orderIndex = orders.findIndex((o) => o.id === orderId)
    if (orderIndex !== -1) {
      orders[orderIndex] = order
      await writeDataFile('labs-web-services-orders.json', orders)
    }

    // Generate referral code if payment is fully completed
    if (order.paymentStatus === 'completed' && order.remainingPayment === 0) {
      try {
        const generateResponse = await fetch(new URL('/api/labs/referrals/generate', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`,
          },
          body: JSON.stringify({
            orderId: order.id,
            email: order.email,
            orderTotal: order.total,
            businessName: order.businessName || order.email.split('@')[0],
          }),
        })
        if (generateResponse.ok) {
          console.log('Referral code generated for order:', order.id)
        }
      } catch (error) {
        console.error('Error generating referral code:', error)
      }
    }

    // Send referral code used notification if applicable
    if (order.appliedReferralCode && order.referrerEmail && order.paymentStatus === 'completed') {
      try {
        const { sendReferralCodeUsedNotification } = await import('@/app/api/labs/web-services/email-utils')
        const webServicesData = await readDataFile<any>('labs-web-services.json', {
          referrerRewardPercentage: 5,
        })
        const rewardPercentage = webServicesData.referrerRewardPercentage || 5
        const rewardAmount = Math.round(order.total * (rewardPercentage / 100))
        
        await sendReferralCodeUsedNotification({
          referrerEmail: order.referrerEmail,
          referralCode: order.appliedReferralCode,
          customerEmail: order.email,
          orderTotal: order.total,
          rewardPercentage: rewardPercentage,
          rewardAmount: rewardAmount,
        })
        console.log('✅ Referral code used notification sent to:', order.referrerEmail)
      } catch (emailError) {
        console.error('Error sending referral code used notification:', emailError)
      }
    }

    // Send order confirmation email with timeline (only on first payment)
    if (!wasPartial && order.email) {
      try {
        const { sendLabsBuildNotificationEmail } = await import('@/app/api/labs/web-services/email-utils')
        await sendLabsBuildNotificationEmail({
          email: order.email,
          name: order.name || order.email.split('@')[0],
          orderId: order.id,
          items: order.items,
          total: order.total,
          initialPayment: order.initialPayment,
          remainingPayment: order.remainingPayment,
          timeline: order.timeline,
        })
        console.log('✅ Labs build notification email sent:', orderId)
      } catch (emailError) {
        console.error('Error sending labs build notification email:', emailError)
      }
    }

    console.log('Labs web services payment processed:', orderId)
  } catch (error) {
    console.error('Error handling labs web services payment:', error)
  }
}

/**
 * Handle Labs tier payment (placeholder for future implementation)
 */
async function handleLabsTierPayment(transaction: any, metadata: any) {
  try {
    console.log('Labs tier payment received:', transaction.reference)
    // TODO: Implement Labs tier payment handling
    // This is a placeholder for future implementation
  } catch (error) {
    console.error('Error handling Labs tier payment:', error)
  }
}

/**
 * Handle yearly subscription renewal payment
 */
async function handleLabsYearlySubscriptionPayment(transaction: any, metadata: any) {
  try {
    const subscriberId = metadata.subscriber_id || metadata.subscriberId
    if (!subscriberId) {
      console.warn('No subscriber_id in yearly subscription payment metadata')
      return
    }

    const subscribers = await readDataFile<any[]>('labs-yearly-subscribers.json', [])
    const subscriber = subscribers.find((s) => s.id === subscriberId)

    if (!subscriber) {
      console.error('Yearly subscriber not found:', subscriberId)
      return
    }

    // Update subscriber's last renewal date
    subscriber.lastRenewalDate = transaction.paidAt || new Date().toISOString()
    
    // Calculate next renewal date (1 year from now)
    const nextRenewal = new Date(subscriber.lastRenewalDate)
    nextRenewal.setFullYear(nextRenewal.getFullYear() + 1)
    subscriber.nextRenewalDate = nextRenewal.toISOString()
    
    subscriber.paymentStatus = 'active'

    // Update subscribers list
    const subscriberIndex = subscribers.findIndex((s) => s.id === subscriberId)
    if (subscriberIndex !== -1) {
      subscribers[subscriberIndex] = subscriber
      await writeDataFile('labs-yearly-subscribers.json', subscribers)
    }

    console.log('✅ Yearly subscription payment processed:', subscriberId)
  } catch (error) {
    console.error('Error handling yearly subscription payment:', error)
  }
}

/**
 * Handle booking balance payment
 */
async function handleBookingBalancePayment(transaction: any, metadata: any) {
  try {
    const bookingId = metadata.booking_id
    if (!bookingId) {
      console.warn('No booking ID in balance payment metadata')
      return
    }

    const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const bookings = bookingsData.bookings || []
    const booking = bookings.find(b => b.id === bookingId)

    if (!booking) {
      console.error('Booking not found for balance payment:', bookingId)
      return
    }

    // Calculate payment amount (convert from subunits if needed)
    const amountPaid = transaction.amount / 100 // Paystack amounts are in subunits

    // Update booking deposit
    const currentDeposit = booking.deposit || 0
    booking.deposit = currentDeposit + amountPaid

    // Add payment record
    if (!booking.payments) {
      booking.payments = []
    }
    booking.payments.push({
      amount: amountPaid,
      method: 'paystack',
      date: transaction.paidAt || new Date().toISOString(),
      transactionId: transaction.reference,
    })

    // Check if fully paid
    const totalPaid = booking.deposit || 0
    const isPaidInFull = totalPaid >= booking.finalPrice

    if (isPaidInFull) {
      if (!booking.paidInFullAt) {
        booking.paidInFullAt = transaction.paidAt || new Date().toISOString()
      }
      if (booking.status === 'confirmed') {
        booking.status = 'paid'
      }
    }

    // Update booking
    const bookingIndex = bookings.findIndex(b => b.id === bookingId)
    if (bookingIndex !== -1) {
      bookings[bookingIndex] = booking
      await writeDataFile('bookings.json', { bookings })
    }

    console.log('Booking balance payment processed:', bookingId, `Amount: ${amountPaid}`)

    // Send payment receipt email
    if (booking.email) {
      try {
        const { sendPaymentReceipt } = await import('@/lib/receipt-email-utils')
        await sendPaymentReceipt({
          recipientEmail: booking.email,
          recipientName: booking.name,
          amount: amountPaid,
          currency: transaction.currency || 'KES',
          paymentMethod: 'Paystack',
          transactionId: transaction.reference,
          transactionDate: transaction.paidAt || new Date().toISOString(),
          bookingId: booking.id,
          serviceName: booking.service || undefined,
          description: booking.isWalkIn 
            ? `Full payment for ${booking.service}`
            : `Balance payment for ${booking.service}`,
        })
        console.log('Payment receipt sent for balance payment:', bookingId)
      } catch (error) {
        console.error('Error sending payment receipt:', error)
      }
    }
  } catch (error) {
    console.error('Error handling booking balance payment:', error)
  }
}

