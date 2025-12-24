import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, verifyTransaction, convertFromSubunits } from '@/lib/paystack-utils'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho, BUSINESS_NOTIFICATION_EMAIL } from '@/lib/email/zoho-config'

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
    console.log('Paystack webhook event:', event.event, event.data?.reference)

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
      switch (paymentType) {
        case 'course_purchase':
          await handleCoursePurchasePayment(verifiedTransaction, metadata)
          break

        case 'consultation':
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
    if (!consultationId) return

    // Check if consultation already exists (legacy support)
    const consultations = await readDataFile<{ consultations: any[] }>('labs-consultations.json', { consultations: [] })
    const existingConsultation = consultations.consultations.find(c => c.consultationId === consultationId)

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
        // Create the actual booking now that payment is confirmed
        try {
          const createResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/booking/create-from-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingReference,
              paymentReference: transaction.reference,
            }),
          })

          if (createResponse.ok) {
            console.log('Booking created from pending data after payment confirmation:', bookingReference)
          } else {
            const errorText = await createResponse.text()
            console.error('Failed to create booking from pending data:', errorText)
          }
        } catch (fetchError) {
          console.error('Error calling create-from-payment endpoint:', fetchError)
          // Note: We can't create booking directly here as it requires many dependencies
          // The endpoint should be accessible, but if it fails, we'll log it
        }
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

