# Lesson 7: Creating Booking API Endpoints

## Introduction

Let's build API routes to handle booking submissions, validate data, and save bookings to storage.

**Estimated Time**: 45 minutes

---

## API Endpoint Requirements

### What We Need

- **POST /api/bookings** - Create new booking
- Validate all data
- Check availability
- Save to file
- Return success/error

---

## Step 1: Create Booking API Route

### Create app/api/bookings/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { saveBooking } from '@/lib/data-utils'
import { getAvailableTimeSlots } from '@/lib/availability-utils'
import { readServices } from '@/lib/data-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serviceIds, date, time, name, email, phone, specialRequests } = body

    // Validation
    if (!serviceIds || serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one service must be selected' },
        { status: 400 }
      )
    }

    if (!date || !time) {
      return NextResponse.json(
        { error: 'Date and time are required' },
        { status: 400 }
      )
    }

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check availability
    const availableSlots = getAvailableTimeSlots(date)
    if (!availableSlots.includes(time)) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 400 }
      )
    }

    // Get service details
    const services = readServices()
    const selectedServices = services.filter(s => serviceIds.includes(s.id))
    
    if (selectedServices.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'Invalid service selected' },
        { status: 400 }
      )
    }

    // Create booking
    const booking = {
      id: `booking-${Date.now()}`,
      serviceIds,
      services: selectedServices.map(s => ({
        id: s.id,
        name: s.name,
        price: s.price
      })),
      date,
      time,
      clientName: name,
      clientEmail: email,
      clientPhone: phone,
      specialRequests: specialRequests || '',
      status: 'confirmed',
      totalPrice: selectedServices.reduce((sum, s) => sum + s.price, 0),
      createdAt: new Date().toISOString()
    }

    // Save booking
    saveBooking(booking)

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      message: 'Booking confirmed successfully'
    })

  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking. Please try again.' },
      { status: 500 }
    )
  }
}
```

---

## Step 2: Create GET Endpoint (Optional)

### Get all bookings

```typescript
import { readBookings } from '@/lib/data-utils'

export async function GET() {
  const bookings = readBookings()
  return NextResponse.json({ bookings })
}
```

---

## Step 3: Error Handling

### Common Errors

- **400 Bad Request**: Invalid data
- **409 Conflict**: Time slot taken
- **500 Server Error**: System error

### User-Friendly Messages

```typescript
{
  error: 'This time slot is no longer available. Please select another time.'
}
```

---

## Step 4: Testing

### Test with curl or Postman

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "serviceIds": ["1"],
    "date": "2024-01-15",
    "time": "10:00",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "555-1234"
  }'
```

---

## Key Takeaways

✅ **API endpoint** handles booking creation

✅ **Validation** ensures data quality

✅ **Availability check** prevents conflicts

✅ **Error handling** provides clear messages

✅ **Booking saved** to file storage

---

## What's Next?

Perfect! API endpoints are working. Next, we'll add booking confirmation to show success and send emails.

**Ready to continue?** Click "Next Lesson" to proceed!

