import { NextRequest, NextResponse } from 'next/server'
import { verifyTransaction } from '@/lib/paystack-utils'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho } from '@/lib/email/zoho-config'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatModelSlotLabel(value?: string): string {
  if (!value) return 'your selected model appointment'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date)
}

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

        if (paymentType === 'model_application_fee') {
          const modelApplications = await readDataFile<{ applications: any[] }>('model-applications.json', { applications: [] })
          const application = modelApplications.applications.find(
            (app) =>
              app.id === metadata.application_id ||
              app.modelFee?.paymentReference === transactionReference
          )

          if (application) {
            const confirmationAlreadySent = application.modelFee?.confirmationEmailSent === true
            const paidAt = transaction.paidAt || new Date().toISOString()
            application.status = 'selected'
            application.modelFee = {
              ...(application.modelFee || {}),
              enabled: true,
              amount: transaction.amount,
              currency: transaction.currency || application.modelFee?.currency || 'KES',
              paymentStatus: 'paid',
              paymentReference: application.modelFee?.paymentReference || transactionReference,
              paymentTransactionId: transactionReference,
              amountPaid: transaction.amount,
              paidAt,
            }

            if (!confirmationAlreadySent && application.email) {
              try {
                const safeFirstName = escapeHtml(application.firstName || 'there')
                const safeAmount = escapeHtml(`${transaction.currency || application.modelFee.currency || 'KES'} ${Number(transaction.amount || 0).toLocaleString()}`)
                const safeSlot = escapeHtml(formatModelSlotLabel(application.availability))
                const safeReference = escapeHtml(transactionReference)

                await sendEmailViaZoho({
                  to: application.email,
                  subject: 'Your LashDiary Model Fee Payment Was Received',
                  html: `
                    <div style="font-family: Georgia, serif; padding: 24px; background: #FDF9F4; color: #7C4B31;">
                      <div style="max-width: 620px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E8D5C4; border-radius: 18px; padding: 28px;">
                        <h1 style="margin: 0 0 16px 0; color: #7C4B31;">Payment Received</h1>
                        <p style="font-size: 16px; line-height: 1.6;">Hey ${safeFirstName},</p>
                        <p style="font-size: 16px; line-height: 1.6;">
                          We received your <strong>${safeAmount}</strong> model confirmation fee. Your selected LashDiary model slot is now marked as paid.
                        </p>
                        <div style="background: #F5F1EB; border-left: 4px solid #7C4B31; padding: 16px; border-radius: 8px; margin: 20px 0;">
                          <p style="margin: 0 0 8px 0;"><strong>Model appointment:</strong> ${safeSlot}</p>
                          <p style="margin: 0;"><strong>Payment reference:</strong> ${safeReference}</p>
                        </div>
                        <p style="font-size: 16px; line-height: 1.6;">
                          Please keep your appointment details and preparation guidelines from the selection email. If you have any questions, reply to that email or contact LashDiary directly.
                        </p>
                        <p style="font-size: 16px; line-height: 1.6;">With love,<br><strong>The LashDiary Team</strong></p>
                      </div>
                    </div>
                  `,
                })
                application.modelFee.confirmationEmailSent = true
                application.modelFee.confirmationEmailSentAt = new Date().toISOString()
              } catch (emailError: any) {
                console.error('Error sending model fee confirmation email:', emailError)
                application.modelFee.confirmationEmailError = emailError?.message || String(emailError)
              }
            }
            await writeDataFile('model-applications.json', modelApplications)
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

