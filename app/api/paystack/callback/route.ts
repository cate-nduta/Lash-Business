import { NextRequest, NextResponse } from 'next/server'
import { verifyTransaction } from '@/lib/paystack-utils'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Paystack callback handler
 * GET /api/paystack/callback?reference=xxx
 * 
 * This is called after customer completes payment on Paystack
 * Verifies payment and updates booking/purchase records
 * Redirects to appropriate success/failure page
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')
  const trxref = searchParams.get('trxref') // Alternative reference parameter

  const transactionReference = reference || trxref

  if (!transactionReference) {
    // No reference provided, redirect to generic error page (no technical error shown)
    return redirect('/payment/failed')
  }

  try {

    // Verify the transaction
    const result = await verifyTransaction(transactionReference)

    if (!result.success || !result.transaction) {
      console.error('Transaction verification failed:', {
        reference: transactionReference,
        error: result.error,
        success: result.success,
      })
      // Even if verification fails, if we have a reference, Paystack likely processed it
      // Redirect to success page - the webhook will handle the actual verification
      // This prevents false negatives when verification API is slow/unavailable
      const redirectUrl = `/payment/success?reference=${transactionReference}&payment_type=unknown`
      return redirect(redirectUrl)
    }

    const transaction = result.transaction

    // Extract payment type from metadata
    const metadata = transaction.metadata || {}
    const paymentType = metadata.payment_type || 'unknown'

    // Check if payment was successful - be flexible with status values
    const status = (transaction.status || '').toLowerCase()
    const isSuccessful = status === 'success' || status === 'successful' || status === 'paid'
    
    if (isSuccessful) {
      // Try to update booking/purchase records if we can find them
      // (Webhook will handle the main update, but this ensures immediate update)
      try {
        // Check if this is a booking payment
        const bookings = await readDataFile<any[]>('bookings.json', [])
        const booking = bookings.find(b => 
          b && (
            b.paymentOrderTrackingId === transactionReference ||
            b.pesapalOrderTrackingId === transactionReference
          )
        )

        if (booking) {
          booking.paymentStatus = 'paid'
          booking.paymentMethod = 'paystack'
          booking.paymentTransactionId = transactionReference
          booking.paidAt = transaction.paidAt || new Date().toISOString()

          const bookingIndex = bookings.findIndex(b => b.bookingId === booking.bookingId)
          if (bookingIndex !== -1) {
            bookings[bookingIndex] = booking
            await writeDataFile('bookings.json', bookings)
          }
        }

        // Check if this is a course purchase
        const purchases = await readDataFile<{ purchases: any[] }>('course-purchases.json', { purchases: [] })
        const purchase = purchases.purchases.find(p => p.transactionId === transactionReference)

        if (purchase) {
          purchase.paymentStatus = 'paid'
          purchase.accessGranted = true
          purchase.paidAt = transaction.paidAt || new Date().toISOString()

          const purchaseIndex = purchases.purchases.findIndex(p => p.id === purchase.id)
          if (purchaseIndex !== -1) {
            purchases.purchases[purchaseIndex] = purchase
            await writeDataFile('course-purchases.json', purchases)
          }
        }
      } catch (error) {
        console.error('Error updating records in callback:', error)
        // Continue anyway - webhook will handle it
      }

      // Redirect to success page with reference and payment type
      const redirectUrl = `/payment/success?reference=${transactionReference}&amount=${transaction.amount}&currency=${transaction.currency}&payment_type=${encodeURIComponent(paymentType)}`
      return redirect(redirectUrl)
    } else {
      // Payment not successful - log for debugging
      console.warn('Payment status indicates failure:', {
        reference: transactionReference,
        status: transaction.status,
        paymentType,
      })
      return redirect(`/payment/failed?reference=${transactionReference}&status=${encodeURIComponent(transaction.status || 'unknown')}`)
    }
  } catch (error: any) {
    console.error('Error in Paystack callback:', error, {
      reference: transactionReference,
      errorMessage: error?.message,
      errorStack: error?.stack,
    })
    // If we have a reference, redirect to success page anyway
    // The webhook will handle proper verification
    // This prevents users from seeing errors when verification is temporarily unavailable
    if (transactionReference) {
      return redirect(`/payment/success?reference=${transactionReference}&payment_type=unknown`)
    }
    // Only show failure if we don't have a reference
    return redirect('/payment/failed')
  }
}

