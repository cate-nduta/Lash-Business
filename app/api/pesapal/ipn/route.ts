import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

// Pesapal API Configuration
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || ''
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || ''
const PESAPAL_ENVIRONMENT = process.env.PESAPAL_ENVIRONMENT || 'sandbox'

const PESAPAL_BASE_URL = PESAPAL_ENVIRONMENT === 'live'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3'

// Get OAuth access token
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PESAPAL_CONSUMER_KEY}:${PESAPAL_CONSUMER_SECRET}`).toString('base64')
  
  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth}`,
    },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    throw new Error('Failed to get Pesapal access token')
  }

  const data = await response.json()
  return data.token
}

// Verify payment status with Pesapal
async function verifyPaymentStatus(orderTrackingId: string): Promise<any> {
  const accessToken = await getAccessToken()
  
  const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to verify payment status')
  }

  return await response.json()
}

// This endpoint receives IPN (Instant Payment Notification) from Pesapal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log the IPN for debugging
    console.log('Pesapal IPN Received:', JSON.stringify(body, null, 2))

    const orderTrackingId = body.OrderTrackingId || body.orderTrackingId
    const orderNotificationType = body.OrderNotificationType || body.orderNotificationType

    if (!orderTrackingId) {
      console.error('Pesapal IPN: Missing OrderTrackingId')
      return NextResponse.json({ message: 'Missing OrderTrackingId' }, { status: 400 })
    }

    // Verify payment status with Pesapal
    const paymentStatus = await verifyPaymentStatus(orderTrackingId)

    console.log('Pesapal Payment Status:', JSON.stringify(paymentStatus, null, 2))

    // Process successful payment
    if (paymentStatus.payment_status_description === 'COMPLETED' || paymentStatus.payment_status_description === 'Completed') {
      const amount = paymentStatus.amount || 0
      const currency = paymentStatus.currency_code || 'KES'
      const paymentMethod = paymentStatus.payment_method || 'Unknown'
      const transactionId = paymentStatus.transaction_id || orderTrackingId

      console.log('✅ Pesapal Payment Successful:', {
        orderTrackingId,
        amount,
        currency,
        paymentMethod,
        transactionId,
      })

      // Try to find and update the booking
      try {
        const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
        const bookings = data.bookings || []
        
        // Find booking by orderTrackingId (could be in initial deposit or balance payment)
        const bookingIndex = bookings.findIndex(b => {
          if (b.pesapalOrderTrackingId === orderTrackingId) return true
          if (b.payments && Array.isArray(b.payments)) {
            return b.payments.some((p: any) => p.pesapalOrderTrackingId === orderTrackingId)
          }
          return false
        })

        if (bookingIndex !== -1) {
          const booking = bookings[bookingIndex]
          
          // Initialize payments array if it doesn't exist
          if (!booking.payments) {
            booking.payments = []
          }

          // Check if this payment already exists
          const existingPaymentIndex = booking.payments.findIndex(
            (p: any) => p.pesapalOrderTrackingId === orderTrackingId
          )

          const paymentRecord = {
            method: 'pesapal',
            amount: currency === 'USD' ? amount : amount,
            currency: currency,
            pesapalOrderTrackingId: orderTrackingId,
            pesapalTransactionId: transactionId,
            paymentMethod: paymentMethod,
            status: 'completed',
            paidAt: new Date().toISOString(),
            verified: true,
          }

          if (existingPaymentIndex !== -1) {
            // Update existing payment
            booking.payments[existingPaymentIndex] = paymentRecord
          } else {
            // Add new payment
            booking.payments.push(paymentRecord)
          }

          // Update booking deposit if this is the first payment
          if (!booking.pesapalOrderTrackingId || booking.pesapalOrderTrackingId === orderTrackingId) {
            booking.pesapalOrderTrackingId = orderTrackingId
            const amountInKES = currency === 'USD' ? amount * 130 : amount // Convert USD to KES if needed
            booking.deposit = (booking.deposit || 0) + amountInKES
          }

          // Mark booking as paid if balance is cleared
          const totalPaid = booking.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
          if (totalPaid >= (booking.finalPrice || 0)) {
            booking.paymentStatus = 'paid'
          }

          await writeDataFile('bookings.json', data)
          
          console.log(`✅ Payment recorded for booking ${booking.id}: ${currency} ${amount.toLocaleString()}`)
        } else {
          console.warn(`⚠️ Booking not found for orderTrackingId: ${orderTrackingId}`)
        }
      } catch (error) {
        console.error('Error updating booking with payment:', error)
      }
    }

    // Always return success to Pesapal
    return NextResponse.json({ 
      message: 'IPN received and processed',
      orderTrackingId 
    })
  } catch (error: any) {
    console.error('Error processing Pesapal IPN:', error)
    // Still return success to prevent Pesapal from retrying
    return NextResponse.json({ 
      message: 'IPN received but processing failed',
      error: error.message 
    }, { status: 500 })
  }
}

