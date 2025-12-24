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
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')
    const trxref = searchParams.get('trxref') // Alternative reference parameter

    const transactionReference = reference || trxref

    if (!transactionReference) {
      // No reference provided, redirect to generic error page (no technical error shown)
      return redirect('/payment/failed')
    }

    // Verify the transaction
    const result = await verifyTransaction(transactionReference)

    if (!result.success) {
      // Redirect to failure page without showing technical error details
      return redirect(`/payment/failed${transactionReference ? `?reference=${transactionReference}` : ''}`)
    }

    const transaction = result.transaction!

    // Check if payment was successful
    if (transaction.status === 'success') {
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

      // Redirect to success page with reference
      return redirect(`/payment/success?reference=${transactionReference}&amount=${transaction.amount}&currency=${transaction.currency}`)
    } else {
      // Payment not successful
      return redirect(`/payment/failed?reference=${transactionReference}&status=${transaction.status}`)
    }
  } catch (error: any) {
    console.error('Error in Paystack callback:', error)
    // Don't show technical errors to users - redirect to generic failure page
    return redirect('/payment/failed')
  }
}

