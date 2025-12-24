# Lesson 8: Adding Booking Confirmation

## Introduction

Let's create a confirmation page that shows booking success and handles the booking completion flow.

**Estimated Time**: 30 minutes

---

## Confirmation Requirements

### What to Show

- Booking confirmation message
- Booking details (date, time, services)
- Booking reference number
- Next steps
- Email confirmation notice

---

## Step 1: Create Confirmation Page

### Create app/booking/confirmation/page.tsx

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ConfirmationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [booking, setBooking] = useState<any>(null)

  useEffect(() => {
    const bookingId = searchParams.get('id')
    if (bookingId) {
      // Fetch booking details
      fetch(`/api/bookings/${bookingId}`)
        .then(res => res.json())
        .then(data => setBooking(data.booking))
    }
  }, [searchParams])

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p>Loading booking details...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
        <p className="text-gray-600">Your appointment has been successfully booked.</p>
      </div>

      {/* Booking Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Reference Number:</span>
            <span className="font-semibold">{booking.id}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-semibold">{new Date(booking.date).toLocaleDateString()}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Time:</span>
            <span className="font-semibold">{booking.time}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Services:</span>
            <span className="font-semibold">
              {booking.services.map((s: any) => s.name).join(', ')}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Total:</span>
            <span className="font-semibold text-blue-600">${booking.totalPrice}</span>
          </div>
        </div>
      </div>

      {/* Email Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800">
          <strong>✓ Confirmation email sent!</strong> Check your inbox at {booking.clientEmail}
        </p>
      </div>

      {/* Next Steps */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-2">What's Next?</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>You'll receive a confirmation email shortly</li>
          <li>We'll send a reminder 24 hours before your appointment</li>
          <li>Please arrive 10 minutes early</li>
          <li>Contact us if you need to reschedule</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          href="/"
          className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Back to Home
        </Link>
        <Link
          href="/booking"
          className="flex-1 border-2 border-blue-600 text-blue-600 text-center py-3 rounded-lg font-semibold hover:bg-blue-50"
        >
          Book Another
        </Link>
      </div>
    </div>
  )
}
```

---

## Step 2: Update Booking API

### Add redirect after booking

```typescript
// In booking page after successful submission
if (response.ok) {
  const data = await response.json()
  router.push(`/booking/confirmation?id=${data.bookingId}`)
}
```

---

## Step 3: Create GET Booking Endpoint

### Create app/api/bookings/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readBookings } from '@/lib/data-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bookings = readBookings()
  const booking = bookings.find(b => b.id === params.id)

  if (!booking) {
    return NextResponse.json(
      { error: 'Booking not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ booking })
}
```

---

## Key Takeaways

✅ **Confirmation page** shows booking success

✅ **Booking details** displayed clearly

✅ **Reference number** for tracking

✅ **Email confirmation** notice

✅ **Next steps** guidance

---

## Module 4 Complete!

Congratulations! You've built the complete booking system core.

**You've created:**
- ✅ Calendar component
- ✅ Time slot selection
- ✅ Service selection
- ✅ Booking form
- ✅ API endpoints
- ✅ Confirmation page

**Next Module**: Payment Integration - Add payment processing!

**Ready to continue?** Click "Next Module" to proceed!

