import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

// This endpoint receives callbacks from M-Pesa after payment processing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log the callback for debugging
    console.log('M-Pesa Callback Received:', JSON.stringify(body, null, 2))

    // Extract payment details from M-Pesa callback
    const resultCode = body.Body?.stkCallback?.ResultCode
    const resultDesc = body.Body?.stkCallback?.ResultDesc
    const checkoutRequestID = body.Body?.stkCallback?.CheckoutRequestID
    const callbackMetadata = body.Body?.stkCallback?.CallbackMetadata?.Item || []

    // Extract payment details
    let amount = null
    let mpesaReceiptNumber = null
    let transactionDate = null
    let phoneNumber = null

    callbackMetadata.forEach((item: any) => {
      if (item.Name === 'Amount') amount = item.Value
      if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value
      if (item.Name === 'TransactionDate') transactionDate = item.Value
      if (item.Name === 'PhoneNumber') phoneNumber = item.Value
    })

    // Process successful payment
    if (resultCode === 0) {
      console.log('✅ M-Pesa Payment Successful:', {
        checkoutRequestID,
        amount,
        mpesaReceiptNumber,
        transactionDate,
        phoneNumber,
      })

      // Try to find and update the booking
      try {
        const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
        const bookings = data.bookings || []
        
        // Find booking by checkoutRequestID (could be in initial deposit or balance payment)
        // Check both mpesaCheckoutRequestID and payments array
        const bookingIndex = bookings.findIndex(b => {
          if (b.mpesaCheckoutRequestID === checkoutRequestID) return true
          if (b.payments && Array.isArray(b.payments)) {
            return b.payments.some((p: any) => p.mpesaCheckoutRequestID === checkoutRequestID)
          }
          return false
        })

        if (bookingIndex !== -1) {
          const booking = bookings[bookingIndex]
          
          // Initialize payments array if it doesn't exist
          if (!booking.payments) {
            booking.payments = []
          }

          // Check if this payment is already recorded
          const paymentExists = booking.payments.some(
            (p: any) => p.mpesaCheckoutRequestID === checkoutRequestID
          )

          if (!paymentExists) {
            // Convert amount from cents to KSH (M-Pesa sends amount in cents)
            const amountInKSH = amount ? amount / 100 : 0

            // Add payment record
            booking.payments.push({
              amount: amountInKSH,
              method: 'mpesa',
              date: new Date().toISOString(),
              mpesaCheckoutRequestID: checkoutRequestID,
              mpesaReceiptNumber: mpesaReceiptNumber,
              transactionDate: transactionDate,
            })

            // Update deposit (add the payment amount)
            booking.deposit = (booking.deposit || 0) + amountInKSH

            if ((booking.deposit || 0) >= booking.finalPrice) {
              if (!booking.paidInFullAt) {
                booking.paidInFullAt = new Date().toISOString()
              }
            }

            // Save updated booking
            bookings[bookingIndex] = booking
            await writeDataFile('bookings.json', { bookings })

            console.log(`✅ Payment recorded for booking ${booking.id}: KSH ${amountInKSH.toLocaleString()}`)
          } else {
            console.log(`ℹ️ Payment already recorded for checkoutRequestID: ${checkoutRequestID}`)
          }
        } else {
          console.log(`⚠️ Booking not found for checkoutRequestID: ${checkoutRequestID}`)
        }
      } catch (bookingError) {
        console.error('Error updating booking with payment:', bookingError)
        // Don't fail the callback if booking update fails
      }
    } else {
      console.log('❌ M-Pesa Payment Failed:', {
        resultCode,
        resultDesc,
        checkoutRequestID,
      })
    }

    // Always return success to M-Pesa (they expect 200 OK)
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully',
    })
  } catch (error: any) {
    console.error('Error processing M-Pesa callback:', error)
    
    // Still return success to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback received',
    })
  }
}

// M-Pesa also sends GET requests to verify the callback URL
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'M-Pesa callback endpoint is active',
  })
}

