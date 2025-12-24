# Module 3: Booking System Core

## Overview

In this module, you'll build the core booking functionality - the heart of your website. You'll create a calendar interface, time slot selection, service selection, and the booking form. By the end, clients will be able to book appointments on your website.

**Estimated Time**: 4-5 hours

---

## Lesson 3.1: Understanding the Booking Flow

Before we start coding, let's understand how the booking system works:

### Booking Flow Steps

1. **Client visits booking page** → Sees available dates
2. **Selects a date** → Time slots appear for that date
3. **Selects a time slot** → Service selection appears
4. **Selects service(s)** → Form appears with client details
5. **Fills out form** → Submits booking
6. **Booking confirmed** → Email sent, calendar updated

### What We'll Build

- Calendar date picker
- Time slot selection
- Service selection
- Booking form
- API endpoint to handle bookings
- Basic booking storage

---

## Lesson 3.2: Setting Up Data Storage

We'll start with a simple file-based storage system. Later, we'll upgrade to a database.

### Step 1: Create Data Directory

1. Create a folder: `data` (in your project root)
2. Create a file: `data/services.json`

### Step 2: Create Services Data

Open `data/services.json` and add:

```json
{
  "services": [
    {
      "id": "1",
      "name": "Classic Lash Set",
      "description": "Natural-looking lash extensions",
      "price": 5000,
      "duration": 120,
      "category": "Lash Extensions"
    },
    {
      "id": "2",
      "name": "Volume Lash Set",
      "description": "Full, voluminous lash extensions",
      "price": 7000,
      "duration": 150,
      "category": "Lash Extensions"
    },
    {
      "id": "3",
      "name": "Hybrid Lash Set",
      "description": "Mix of classic and volume",
      "price": 6000,
      "duration": 135,
      "category": "Lash Extensions"
    },
    {
      "id": "4",
      "name": "Lash Fill",
      "description": "Refill for existing extensions",
      "price": 3000,
      "duration": 90,
      "category": "Maintenance"
    }
  ]
}
```

**Customize this** with your actual services, prices, and durations (in minutes).

### Step 3: Create Bookings Storage

Create `data/bookings.json`:

```json
{
  "bookings": []
}
```

This will store all bookings. Initially empty.

### Step 4: Create Availability Data

Create `data/availability.json`:

```json
{
  "businessHours": {
    "monday": { "enabled": true, "start": "09:00", "end": "18:00" },
    "tuesday": { "enabled": true, "start": "09:00", "end": "18:00" },
    "wednesday": { "enabled": true, "start": "09:00", "end": "18:00" },
    "thursday": { "enabled": true, "start": "09:00", "end": "18:00" },
    "friday": { "enabled": true, "start": "09:00", "end": "18:00" },
    "saturday": { "enabled": true, "start": "10:00", "end": "16:00" },
    "sunday": { "enabled": false }
  },
  "timeSlots": {
    "weekday": [
      { "hour": 9, "minute": 0, "label": "9:00 AM" },
      { "hour": 11, "minute": 0, "label": "11:00 AM" },
      { "hour": 13, "minute": 0, "label": "1:00 PM" },
      { "hour": 15, "minute": 0, "label": "3:00 PM" },
      { "hour": 17, "minute": 0, "label": "5:00 PM" }
    ],
    "saturday": [
      { "hour": 10, "minute": 0, "label": "10:00 AM" },
      { "hour": 12, "minute": 0, "label": "12:00 PM" },
      { "hour": 14, "minute": 0, "label": "2:00 PM" }
    ]
  }
}
```

**Customize this** with your actual business hours and available time slots.

### Step 5: Create Data Utility Functions

Create `lib/data-utils.ts`:

```typescript
import fs from 'fs'
import path from 'path'

const dataDir = path.join(process.cwd(), 'data')

export async function readDataFile<T>(
  filename: string,
  defaultValue: T
): Promise<T> {
  try {
    const filePath = path.join(dataDir, filename)
    const fileContents = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(fileContents) as T
  } catch (error) {
    console.error(`Error reading ${filename}:`, error)
    return defaultValue
  }
}

export async function writeDataFile<T>(
  filename: string,
  data: T
): Promise<void> {
  try {
    const filePath = path.join(dataDir, filename)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  } catch (error) {
    console.error(`Error writing ${filename}:`, error)
    throw error
  }
}
```

This utility helps us read and write JSON files easily.

✅ **Checkpoint**: You should have 3 JSON files in the `data` folder and a utility file!

---

## Lesson 3.3: Creating the Services API

We need an API endpoint to fetch services. In Next.js, API routes go in the `app/api` folder.

### Step 1: Create Services API Route

Create `app/api/services/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET() {
  try {
    const data = await readDataFile<{ services: any[] }>('services.json', { services: [] })
    return NextResponse.json(data.services)
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
```

### Step 2: Test the API

1. Start your dev server: `npm run dev`
2. Visit: `http://localhost:3000/api/services`
3. You should see your services in JSON format!

✅ **Checkpoint**: The API should return your services list!

---

## Lesson 3.4: Building the Booking Page

Now let's create the booking page where clients will make appointments.

### Step 1: Create Booking Page

Create `app/booking/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  category: string
}

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedService, setSelectedService] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Load services
  useEffect(() => {
    async function loadServices() {
      try {
        const response = await fetch('/api/services')
        const data = await response.json()
        setServices(data)
      } catch (error) {
        console.error('Error loading services:', error)
      } finally {
        setLoading(false)
      }
    }
    loadServices()
  }, [])

  // Get available dates (next 30 days)
  const getAvailableDates = () => {
    const dates: string[] = []
    const today = new Date()
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dates.push(dateStr)
    }
    
    return dates
  }

  const availableDates = getAvailableDates()

  // Get time slots (simplified - we'll improve this later)
  const timeSlots = [
    '9:00 AM',
    '11:00 AM',
    '1:00 PM',
    '3:00 PM',
    '5:00 PM'
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-center mb-8">Book an Appointment</h1>

        {/* Step 1: Select Date */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">1. Select Date</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {availableDates.map((date) => {
              const dateObj = new Date(date)
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
              const dayNum = dateObj.getDate()
              const month = dateObj.toLocaleDateString('en-US', { month: 'short' })
              
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`p-4 border-2 rounded-lg text-center transition ${
                    selectedDate === date
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-sm text-gray-600">{dayName}</div>
                  <div className="text-xl font-bold">{dayNum}</div>
                  <div className="text-xs text-gray-500">{month}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Select Time (only if date selected) */}
        {selectedDate && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">2. Select Time</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`p-4 border-2 rounded-lg text-center transition ${
                    selectedTime === time
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Service (only if time selected) */}
        {selectedTime && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">3. Select Service</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition ${
                    selectedService === service.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{service.name}</h3>
                      <p className="text-gray-600 text-sm">{service.description}</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Duration: {service.duration} minutes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl">KES {service.price.toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Booking Form (only if service selected) */}
        {selectedService && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">4. Your Details</h2>
            <BookingForm
              date={selectedDate}
              time={selectedTime}
              serviceId={selectedService}
              services={services}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Booking Form Component
function BookingForm({ date, time, serviceId, services }: {
  date: string
  time: string
  serviceId: string
  services: Service[]
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const selectedService = services.find(s => s.id === serviceId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date,
          time,
          serviceId,
          serviceName: selectedService?.name,
          price: selectedService?.price
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Booking confirmed! Check your email.' })
        setFormData({ name: '', email: '', phone: '', notes: '' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Booking failed. Please try again.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone *
        </label>
        <input
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {selectedService && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Booking Summary</h3>
          <p><strong>Service:</strong> {selectedService.name}</p>
          <p><strong>Date:</strong> {new Date(date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> {time}</p>
          <p><strong>Price:</strong> KES {selectedService.price.toLocaleString()}</p>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {submitting ? 'Booking...' : 'Confirm Booking'}
      </button>
    </form>
  )
}
```

### Step 2: Understanding the Code

**State Management:**
- `selectedDate`, `selectedTime`, `selectedService` - Track user selections
- `services` - Store loaded services
- `formData` - Store form input

**Progressive Disclosure:**
- Each step only appears after the previous one is completed
- This creates a guided booking experience

**Date Selection:**
- Shows next 30 days
- Formatted nicely with day name, number, and month

✅ **Checkpoint**: Your booking page should display and allow step-by-step selection!

---

## Lesson 3.5: Creating the Booking API

Now we need an API endpoint to save bookings.

### Step 1: Create Bookings API Route

Create `app/api/bookings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json()

    // Validate required fields
    const { name, email, phone, date, time, serviceId, serviceName, price } = bookingData

    if (!name || !email || !phone || !date || !time || !serviceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Load existing bookings
    const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })

    // Create new booking
    const newBooking = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      date,
      time,
      serviceId,
      serviceName,
      price,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    }

    // Add to bookings array
    data.bookings.push(newBooking)

    // Save back to file
    await writeDataFile('bookings.json', data)

    // TODO: Send email confirmation (we'll add this in Module 7)
    // TODO: Add to calendar (we'll add this in Module 3.6)

    return NextResponse.json({
      success: true,
      booking: newBooking
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch bookings (for admin later)
export async function GET() {
  try {
    const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    return NextResponse.json(data.bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}
```

### Step 2: Test the Booking Flow

1. Go to `/booking` page
2. Select a date
3. Select a time
4. Select a service
5. Fill out the form
6. Submit

Check `data/bookings.json` - your booking should be there!

✅ **Checkpoint**: Bookings should be saved successfully!

---

## Lesson 3.6: Improving Time Slot Selection

Let's make time slots dynamic based on the selected date and business hours.

### Step 1: Create Availability API

Create `app/api/availability/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      // Return availability configuration
      const availability = await readDataFile('availability.json', {})
      return NextResponse.json(availability)
    }

    // Get time slots for specific date
    const availability = await readDataFile('availability.json', {})
    const bookings = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })

    // Get day of week
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'lowercase' })

    // Get business hours for this day
    const dayHours = availability.businessHours?.[dayOfWeek]
    
    if (!dayHours?.enabled) {
      return NextResponse.json({ timeSlots: [] })
    }

    // Get time slots for this day type
    const isSaturday = dayOfWeek === 'saturday'
    const slotKey = isSaturday ? 'saturday' : 'weekday'
    const slots = availability.timeSlots?.[slotKey] || []

    // Filter out booked times
    const bookedTimes = bookings.bookings
      .filter(b => b.date === date && b.status === 'confirmed')
      .map(b => b.time)

    const availableSlots = slots.filter(slot => {
      const slotTime = slot.label
      return !bookedTimes.includes(slotTime)
    })

    return NextResponse.json({ timeSlots: availableSlots })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}
```

### Step 2: Update Booking Page to Use Dynamic Slots

Update the booking page to fetch time slots based on selected date:

```typescript
// Add this state
const [timeSlots, setTimeSlots] = useState<string[]>([])
const [loadingSlots, setLoadingSlots] = useState(false)

// Add this useEffect
useEffect(() => {
  if (selectedDate) {
    setLoadingSlots(true)
    fetch(`/api/availability?date=${selectedDate}`)
      .then(res => res.json())
      .then(data => {
        setTimeSlots(data.timeSlots.map((s: any) => s.label))
      })
      .catch(err => console.error('Error loading slots:', err))
      .finally(() => setLoadingSlots(false))
  } else {
    setTimeSlots([])
  }
}, [selectedDate])

// Update time slot display
{selectedDate && (
  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 className="text-2xl font-semibold mb-4">2. Select Time</h2>
    {loadingSlots ? (
      <div className="text-center py-4">Loading available times...</div>
    ) : timeSlots.length === 0 ? (
      <div className="text-center py-4 text-gray-500">No available times for this date</div>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {timeSlots.map((time) => (
          // ... existing time slot buttons
        ))}
      </div>
    )}
  </div>
)}
```

✅ **Checkpoint**: Time slots should now be dynamic and exclude booked times!

---

## Module 3 Checkpoint

Before moving to Module 4, make sure you have:

✅ Created data storage files (services, bookings, availability)  
✅ Created API endpoints for services and bookings  
✅ Built a working booking page with step-by-step flow  
✅ Implemented dynamic time slot selection  
✅ Bookings are being saved successfully  
✅ Tested the complete booking flow  

### Common Issues & Solutions

**Problem**: API routes return 404  
**Solution**: Make sure files are in `app/api/[route-name]/route.ts` format

**Problem**: Bookings not saving  
**Solution**: Check file permissions and make sure `data` folder exists

**Problem**: Time slots not showing  
**Solution**: Verify `availability.json` has correct structure

**Problem**: Date selection not working  
**Solution**: Check date format (should be YYYY-MM-DD)

---

## Example Implementations

To help you understand the concepts, we've created simplified example implementations in the `COURSE_EXAMPLES/` folder:

- **`module-3-simple-booking-page.tsx`** - Simplified booking page component
- **`module-3-simple-services-api.ts`** - Basic services API endpoint
- **`module-3-simple-availability-api.ts`** - Availability checking API
- **`module-3-simple-bookings-api.ts`** - Booking creation API

These examples follow the exact structure from this module and can be used as reference implementations. Compare them with the actual implementation in the codebase to see how concepts scale to a production system.

See `COURSE_EXAMPLES/README.md` for more details.

## What's Next?

Congratulations! You've built the core booking system. You now have:
- ✅ Service selection
- ✅ Date and time selection
- ✅ Booking form
- ✅ Booking storage
- ✅ Dynamic availability

**Ready for Module 4?**  
Open `MODULE_04_PAYMENT_INTEGRATION.md` to add payment processing!

---

## Practice Exercise

Before moving on, try these exercises:

1. **Add more services** - Add at least 5 more services to your `services.json`
2. **Customize business hours** - Update `availability.json` with your actual hours
3. **Add booking validation** - Prevent double-booking the same time slot
4. **Improve date display** - Show "Today", "Tomorrow" labels for dates
5. **Add service categories** - Group services by category on the booking page

