# Lesson 6: Handling Payment Callbacks

## Introduction

Let's create the callback endpoint that Pesapal uses to notify your website when a payment is completed or fails.

**Estimated Time**: 35 minutes

---

## Understanding Callbacks

### What is a Callback?

Pesapal sends a notification to your website when payment status changes. This ensures your booking system stays updated.

### Callback Types

- **IPN (Instant Payment Notification)**: Server-to-server notification
- **Callback URL**: Redirect after payment
- **Both**: Recommended for reliability

---

## Step 1: Create Callback Endpoint

### Create app/api/payments/callback/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateBookingPaymentStatus } from '@/lib/data-utils'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const orderTrackingId = searchParams.get('OrderTrackingId')
  const orderMerchantReference = searchParams.get('OrderMerchantReference')

  if (!orderTrackingId) {
    return NextResponse.redirect('/booking?error=invalid_callback')
  }

  // Verify payment status with Pesapal
  const paymentStatus = await verifyPaymentStatus(orderTrackingId)

  if (paymentStatus === 'COMPLETED') {
    // Extract booking ID from reference
    const bookingId = extractBookingId(orderMerchantReference)
    
    // Update booking status
    await updateBookingPaymentStatus(bookingId, 'paid')

    // Redirect to success page
    return NextResponse.redirect(`/booking/confirmation?id=${bookingId}`)
  }

  // Payment failed or pending
  return NextResponse.redirect(`/booking?error=payment_${paymentStatus.toLowerCase()}`)
}

async function verifyPaymentStatus(orderTrackingId: string): Promise<string> {
  // Call Pesapal API to verify status
  const response = await fetch(`/api/payments/status?orderTrackingId=${orderTrackingId}`)
  const data = await response.json()
  return data.status
}

function extractBookingId(reference: string | null): string {
  if (!reference) return ''
  // Extract booking ID from "booking-{id}-{timestamp}"
  const match = reference.match(/booking-(\d+)/)
  return match ? match[1] : ''
}
```

---

## Step 2: Create IPN Endpoint

### Create app/api/payments/ipn/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateBookingPaymentStatus } from '@/lib/data-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = body

    // Verify this is a valid IPN from Pesapal
    // (In production, verify signature)

    if (OrderNotificationType === 'CHANGE') {
      // Payment status changed
      const status = await getPaymentStatus(OrderTrackingId)
      
      if (status === 'COMPLETED') {
        const bookingId = extractBookingId(OrderMerchantReference)
        await updateBookingPaymentStatus(bookingId, 'paid')
        
        // Send confirmation email
        await sendBookingConfirmationEmail(bookingId)
      }
    }

    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('IPN error:', error)
    return NextResponse.json({ error: 'IPN processing failed' }, { status: 500 })
  }
}

async function getPaymentStatus(orderTrackingId: string): Promise<string> {
  // Fetch from Pesapal API
  return 'COMPLETED' // Simplified
}

function extractBookingId(reference: string): string {
  const match = reference.match(/booking-(\d+)/)
  return match ? match[1] : ''
}

async function sendBookingConfirmationEmail(bookingId: string) {
  // Send email (will be implemented in email module)
}
```

---

## Step 3: Update Booking Status Function

### Update lib/data-utils.ts

```typescript
export function updateBookingPaymentStatus(bookingId: string, status: 'paid' | 'pending' | 'failed') {
  const bookings = readBookings()
  const booking = bookings.find(b => b.id === bookingId)
  
  if (booking) {
    booking.paymentStatus = status
    booking.paidAt = status === 'paid' ? new Date().toISOString() : null
    
    saveBookings(bookings)
    return booking
  }
  
  return null
}
```

---

## Step 4: Security Considerations

### Verify IPN Requests

```typescript
// Verify IPN signature (simplified)
function verifyIPNSignature(request: NextRequest): boolean {
  // In production, verify Pesapal signature
  // to ensure request is authentic
  return true // Simplified for now
}
```

---

## Key Takeaways

✅ **Callback endpoint** handles payment return

✅ **IPN endpoint** receives server notifications

✅ **Booking status** updated automatically

✅ **Security verification** important for production

---

## What's Next?

Perfect! Payment callbacks are working. Next, we'll add payment receipts.

**Ready to continue?** Click "Next Lesson" to proceed!

