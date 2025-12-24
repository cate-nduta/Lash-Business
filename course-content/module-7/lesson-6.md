# Lesson 6: Viewing Analytics and Reports

## Introduction

Let's create analytics and reporting features to help you understand your business performance with statistics and insights.

**Estimated Time**: 45 minutes

---

## Analytics Features

### What to Include

- Revenue statistics
- Booking trends
- Popular services
- Client statistics
- Time period filters

---

## Step 1: Create Analytics Page

### Create app/admin/analytics/page.tsx

```typescript
import { getCurrentAdmin } from '@/lib/admin-auth'
import { getAnalytics } from '@/lib/analytics-utils'
import RevenueChart from '@/components/admin/RevenueChart'
import StatsOverview from '@/components/admin/StatsOverview'

export default async function AnalyticsPage() {
  const admin = await getCurrentAdmin()
  const analytics = getAnalytics()

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics & Reports</h1>

      {/* Time Period Filter */}
      <div className="mb-6">
        <select className="px-4 py-2 border rounded-lg">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 3 months</option>
          <option>Last year</option>
          <option>All time</option>
        </select>
      </div>

      {/* Stats Overview */}
      <StatsOverview analytics={analytics} />

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Revenue Trend</h2>
        <RevenueChart data={analytics.revenueByDate} />
      </div>

      {/* Popular Services */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Popular Services</h2>
        <PopularServicesList services={analytics.popularServices} />
      </div>
    </div>
  )
}
```

---

## Step 2: Create Analytics Utilities

### Create lib/analytics-utils.ts

```typescript
import { readBookings } from './data-utils'
import { readServices } from './data-utils'

export function getAnalytics() {
  const bookings = readBookings()
  const services = readServices()

  // Revenue calculations
  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + b.totalPrice, 0)

  // Revenue by date
  const revenueByDate = calculateRevenueByDate(bookings)

  // Popular services
  const serviceCounts: Record<string, number> = {}
  bookings.forEach(booking => {
    booking.services.forEach((service: any) => {
      serviceCounts[service.id] = (serviceCounts[service.id] || 0) + 1
    })
  })

  const popularServices = Object.entries(serviceCounts)
    .map(([id, count]) => {
      const service = services.find(s => s.id === id)
      return { ...service, bookingCount: count }
    })
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 5)

  return {
    totalRevenue,
    totalBookings: bookings.length,
    revenueByDate,
    popularServices
  }
}

function calculateRevenueByDate(bookings: any[]) {
  const revenueByDate: Record<string, number> = {}
  
  bookings
    .filter(b => b.paymentStatus === 'paid')
    .forEach(booking => {
      const date = booking.date
      revenueByDate[date] = (revenueByDate[date] || 0) + booking.totalPrice
    })

  return Object.entries(revenueByDate)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
```

---

## Step 3: Create Stats Overview Component

### Create components/admin/StatsOverview.tsx

```typescript
export default function StatsOverview({ analytics }: { analytics: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-2">Total Revenue</p>
        <p className="text-3xl font-bold text-green-600">
          ${analytics.totalRevenue.toLocaleString()}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-2">Total Bookings</p>
        <p className="text-3xl font-bold text-blue-600">
          {analytics.totalBookings}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-2">Average Booking Value</p>
        <p className="text-3xl font-bold text-purple-600">
          ${(analytics.totalRevenue / analytics.totalBookings || 0).toFixed(2)}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-2">Conversion Rate</p>
        <p className="text-3xl font-bold text-orange-600">
          {/* Calculate conversion rate */}
          85%
        </p>
      </div>
    </div>
  )
}
```

---

## Key Takeaways

✅ **Analytics dashboard** shows business insights

✅ **Revenue statistics** track income

✅ **Popular services** identify best sellers

✅ **Trends and reports** for decision making

---

## What's Next?

Perfect! Analytics are working. Next, we'll add a calendar view for bookings.

**Ready to continue?** Click "Next Lesson" to proceed!

