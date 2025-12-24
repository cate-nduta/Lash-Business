# Module 6: Admin Dashboard

## Overview

In this module, you'll create an admin dashboard where you can manage bookings, clients, services, and view analytics. This is the control center for your booking website, allowing you to oversee all operations.

**Estimated Time**: 4-5 hours

---

## Lesson 6.1: Understanding Admin Authentication

### Why Admin Authentication?

Admin authentication is separate from client authentication because:
- **Different access levels** - Admins need full access to all data
- **Security** - Admin functions are sensitive and need extra protection
- **Separation of concerns** - Keep admin and client systems separate

### Admin Features We'll Build

- **Dashboard Overview** - Statistics and quick insights
- **Bookings Management** - View, edit, cancel bookings
- **Client Management** - View client list and details
- **Service Management** - Add, edit, delete services
- **Analytics** - View booking statistics and revenue

---

## Lesson 6.2: Setting Up Admin Authentication

Let's create admin authentication similar to client auth, but separate.

### Step 1: Create Admin Data Structure

First, let's set up admin users. Create `data/admins.json`:

```json
{
  "admins": [
    {
      "id": "admin-1",
      "username": "admin",
      "email": "admin@yourbusiness.com",
      "passwordHash": "hashed-password-here",
      "role": "owner",
      "canManageAdmins": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isActive": true
    }
  ]
}
```

### Step 2: Create Admin Authentication Helper

Create `lib/admin-auth.ts`:

```typescript
import { cookies } from 'next/headers'

export const ADMIN_AUTH_COOKIE = 'admin-auth'
export const ADMIN_USER_COOKIE = 'admin-user'
export const ADMIN_LAST_ACTIVE_COOKIE = 'admin-last-active'
export const ADMIN_SESSION_MAX_IDLE_MS = 1000 * 60 * 60 * 2 // 2 hours

type AdminSession = {
  username: string
  lastActive: number
}

const loadAdminSession = (): AdminSession | null => {
  const cookieStore = cookies()
  const authCookie = cookieStore.get(ADMIN_AUTH_COOKIE)?.value
  
  if (authCookie !== 'authenticated') {
    return null
  }

  const lastActiveRaw = cookieStore.get(ADMIN_LAST_ACTIVE_COOKIE)?.value
  const lastActive = lastActiveRaw ? Number(lastActiveRaw) : NaN
  
  if (!Number.isFinite(lastActive)) {
    return null
  }

  // Check if session expired
  if (Date.now() - lastActive > ADMIN_SESSION_MAX_IDLE_MS) {
    return null
  }

  const username = cookieStore.get(ADMIN_USER_COOKIE)?.value || 'admin'

  return {
    username,
    lastActive,
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return Boolean(loadAdminSession())
}

export async function getAdminUsername(): Promise<string | null> {
  const session = loadAdminSession()
  return session?.username || null
}

export async function requireAdminAuth() {
  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    throw new Error('Unauthorized')
  }
}
```

### Step 3: Create Admin Login API

Create `app/api/admin/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { verifyPassword } from '@/lib/password-utils'
import { sanitizeText } from '@/lib/input-validation'

interface Admin {
  id: string
  username: string
  email: string
  passwordHash: string
  role: string
  isActive: boolean
  lastLoginAt?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username: rawUsername, password } = body

    if (!rawUsername || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Sanitize username
    const username = sanitizeText(rawUsername).toLowerCase().trim()

    // Load admins
    const adminsData = await readDataFile<{ admins: Admin[] }>('admins.json', { admins: [] })

    // Find admin
    const admin = adminsData.admins.find(
      (a) => a.username.toLowerCase() === username && a.isActive
    )

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = verifyPassword(password, admin.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Update last login
    admin.lastLoginAt = new Date().toISOString()
    await writeDataFile('admins.json', adminsData)

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      },
      { status: 200 }
    )

    // Set authentication cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 60 * 60 * 2, // 2 hours
    }

    response.cookies.set(ADMIN_AUTH_COOKIE, 'authenticated', cookieOptions)
    response.cookies.set(ADMIN_USER_COOKIE, admin.username, cookieOptions)
    response.cookies.set(ADMIN_LAST_ACTIVE_COOKIE, String(Date.now()), cookieOptions)

    return response
  } catch (error: any) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    )
  }
}
```

**Note**: Import `ADMIN_AUTH_COOKIE`, `ADMIN_USER_COOKIE`, and `ADMIN_LAST_ACTIVE_COOKIE` from `@/lib/admin-auth`

### Step 4: Create Admin Login Page

Create `app/admin/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/admin')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the admin dashboard
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

✅ **Checkpoint**: Admin login should work!

---

## Lesson 6.3: Creating Admin Dashboard Layout

Let's create a layout for the admin dashboard with navigation.

### Step 1: Create Admin Layout

Create `app/admin/layout.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = await isAdminAuthenticated()

  if (!isAuthenticated) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link
                href="/admin"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-blue-500"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/bookings"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Bookings
              </Link>
              <Link
                href="/admin/clients"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Clients
              </Link>
              <Link
                href="/admin/services"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Services
              </Link>
            </div>
            <div className="flex items-center">
              <Link
                href="/admin/logout"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
```

### Step 2: Create Admin Dashboard Homepage

Create `app/admin/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'

export default async function AdminDashboard() {
  const isAuthenticated = await isAdminAuthenticated()

  if (!isAuthenticated) {
    redirect('/admin/login')
  }

  // Load data for statistics
  const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
  const usersData = await readDataFile<{ users: any[] }>('users.json', { users: [] })
  const servicesData = await readDataFile<{ categories: any[] }>('services.json', { categories: [] })

  // Calculate statistics
  const totalBookings = bookingsData.bookings.length
  const confirmedBookings = bookingsData.bookings.filter(b => b.status === 'confirmed').length
  const totalClients = usersData.users.length
  const totalServices = servicesData.categories.reduce((sum, cat) => sum + (cat.services?.length || 0), 0)

  // Calculate revenue (sum of all paid bookings)
  const totalRevenue = bookingsData.bookings
    .filter(b => b.status === 'confirmed' || b.status === 'paid')
    .reduce((sum, b) => sum + (b.finalPrice || b.price || 0), 0)

  // Get recent bookings
  const recentBookings = bookingsData.bookings
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date)
      const dateB = new Date(b.createdAt || b.date)
      return dateB.getTime() - dateA.getTime()
    })
    .slice(0, 5)

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalBookings}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Confirmed</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{confirmedBookings}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Clients</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{totalClients}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            KES {totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Recent Bookings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {booking.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.serviceName || booking.service}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(booking.date).toLocaleDateString()} {booking.timeSlot}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    KES {(booking.finalPrice || booking.price || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

✅ **Checkpoint**: Admin dashboard should display!

---

## Lesson 6.4: Creating Bookings Management

Let's create a page to manage all bookings.

### Step 1: Create Bookings Management Page

Create `app/admin/bookings/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Booking {
  id: string
  name: string
  email: string
  phone: string
  serviceName: string
  date: string
  timeSlot: string
  status: string
  finalPrice?: number
  price?: number
  createdAt: string
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all')

  useEffect(() => {
    loadBookings()
  }, [filter])

  const loadBookings = async () => {
    try {
      const response = await fetch('/api/admin/bookings', {
        credentials: 'include',
      })
      const data = await response.json()
      
      let filteredBookings = data.bookings || []
      if (filter !== 'all') {
        filteredBookings = filteredBookings.filter((b: Booking) => b.status === filter)
      }
      
      setBookings(filteredBookings)
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        loadBookings()
      }
    } catch (error) {
      console.error('Error updating booking:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading bookings...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bookings Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded ${filter === 'confirmed' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded ${filter === 'cancelled' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Cancelled
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{booking.name}</div>
                    <div className="text-sm text-gray-500">{booking.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {booking.serviceName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(booking.date).toLocaleDateString()} {booking.timeSlot}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={booking.status}
                    onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                    className="text-sm border-gray-300 rounded"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  KES {(booking.finalPrice || booking.price || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### Step 2: Create Bookings API

Create `app/api/admin/bookings/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'

export async function GET() {
  try {
    await requireAdminAuth()

    const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })

    return NextResponse.json({
      bookings: bookingsData.bookings,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to load bookings' },
      { status: 500 }
    )
  }
}
```

✅ **Checkpoint**: Bookings management should work!

---

## Lesson 6.5: Creating Client Management

Let's create a page to view and manage clients.

### Step 1: Create Clients Management Page

Create `app/admin/clients/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'
import Link from 'next/link'

export default async function AdminClients() {
  const isAuthenticated = await isAdminAuthenticated()

  if (!isAuthenticated) {
    redirect('/admin/login')
  }

  const usersData = await readDataFile<{ users: any[] }>('users.json', { users: [] })
  const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })

  // Get client statistics
  const clientsWithStats = usersData.users.map(user => {
    const userBookings = bookingsData.bookings.filter(
      b => b.email?.toLowerCase() === user.email.toLowerCase()
    )
    const totalSpent = userBookings.reduce((sum, b) => sum + (b.finalPrice || b.price || 0), 0)
    
    return {
      ...user,
      bookingCount: userBookings.length,
      totalSpent,
      lastBooking: userBookings.length > 0 
        ? userBookings.sort((a, b) => {
            const dateA = new Date(a.date)
            const dateB = new Date(b.date)
            return dateB.getTime() - dateA.getTime()
          })[0]
        : null,
    }
  })

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Clients Management</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Booking</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clientsWithStats.map((client) => (
              <tr key={client.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {client.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {client.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {client.phone || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {client.bookingCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  KES {client.totalSpent.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {client.lastBooking 
                    ? new Date(client.lastBooking.date).toLocaleDateString()
                    : '-'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

✅ **Checkpoint**: Client management should work!

---

## Module 6 Checkpoint

Before moving to Module 7, make sure you have:

✅ Created admin authentication system  
✅ Created admin login page  
✅ Created admin dashboard layout  
✅ Created dashboard homepage with statistics  
✅ Created bookings management page  
✅ Created client management page  
✅ Tested admin login and navigation  
✅ Protected admin routes  

### Common Issues & Solutions

**Problem**: "Unauthorized" errors  
**Solution**: Make sure admin cookies are being set correctly

**Problem**: Admin session expires too quickly  
**Solution**: Check `ADMIN_SESSION_MAX_IDLE_MS` value

**Problem**: Can't access admin pages  
**Solution**: Verify `isAdminAuthenticated()` is working in layout

---

## What's Next?

Congratulations! You've created the admin dashboard. You now have:
- ✅ Admin authentication
- ✅ Dashboard overview
- ✅ Bookings management
- ✅ Client management
- ✅ Statistics and analytics

**Ready for Module 7?**  
Open `MODULE_07_EMAIL_NOTIFICATIONS.md` to add email confirmations and reminders!

---

## Practice Exercise

Before moving on, try these exercises:

1. **Add service management** - Create page to add/edit/delete services
2. **Add booking details page** - Show full booking information
3. **Add export functionality** - Export bookings to CSV
4. **Add search/filter** - Search bookings by client name or date
5. **Add analytics charts** - Visual charts for revenue and bookings

