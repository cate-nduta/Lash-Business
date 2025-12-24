# Lesson 7: Calendar View for Bookings

## Introduction

Let's create a calendar view to visualize all bookings at a glance, making it easy to see your schedule.

**Estimated Time**: 40 minutes

---

## Calendar View Features

### What to Include

- Monthly calendar view
- Bookings displayed on dates
- Click to view booking details
- Navigate between months
- Color coding by status

---

## Step 1: Create Calendar Page

### Create app/admin/calendar/page.tsx

```typescript
import { getCurrentAdmin } from '@/lib/admin-auth'
import { readBookings } from '@/lib/data-utils'
import BookingCalendar from '@/components/admin/BookingCalendar'

export default async function CalendarPage() {
  const admin = await getCurrentAdmin()
  const bookings = readBookings()

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Calendar View</h1>
      <BookingCalendar bookings={bookings} />
    </div>
  )
}
```

---

## Step 2: Create Booking Calendar Component

### Create components/admin/BookingCalendar.tsx

```typescript
'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns'
import Link from 'next/link'

export default function BookingCalendar({ bookings }: { bookings: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return bookings.filter(b => b.date === dateStr)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <h2 className="text-xl font-bold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map(day => {
          const dayBookings = getBookingsForDate(day)
          return (
            <div
              key={day.toString()}
              className="min-h-24 border border-gray-200 rounded p-2 hover:bg-gray-50"
            >
              <div className="text-sm font-medium mb-1">
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map(booking => (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings/${booking.id}`}
                    className={`block text-xs p-1 rounded truncate ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {booking.time} - {booking.clientName}
                  </Link>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## Key Takeaways

✅ **Calendar view** visualizes all bookings

✅ **Monthly navigation** browse different months

✅ **Booking details** click to view

✅ **Color coding** by status

---

## Module 7 Complete!

Congratulations! Admin dashboard is complete.

**You've built:**
- ✅ Admin authentication
- ✅ Dashboard layout
- ✅ Booking management
- ✅ Client management
- ✅ Service management
- ✅ Analytics and reports
- ✅ Calendar view

**Next Module**: Email & Notifications!

**Ready to continue?** Click "Next Module" to proceed!

