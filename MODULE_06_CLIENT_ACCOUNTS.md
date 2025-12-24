# Module 5: Client Accounts & Authentication

## Overview

In this module, you'll add user authentication and client accounts to your booking website. Clients will be able to register, log in, view their booking history, and manage their profile. This creates a better user experience and allows clients to track their appointments.

**Estimated Time**: 3-4 hours

---

## Lesson 5.1: Understanding Client Accounts

### Why Client Accounts?

Client accounts allow your customers to:
- **Save their information** - No need to re-enter details for each booking
- **View booking history** - See all past and upcoming appointments
- **Manage bookings** - Cancel or reschedule appointments
- **Track payments** - View payment history
- **Update preferences** - Manage their profile and preferences

### Authentication Flow

1. **Registration** → Client creates account with email and password
2. **Login** → Client logs in with credentials
3. **Session** → Server creates secure session (cookies)
4. **Protected Routes** → Client can access account pages
5. **Logout** → Session is cleared

### Security Considerations

- **Password Hashing** - Never store plain text passwords
- **Secure Cookies** - Use httpOnly, secure cookies for sessions
- **Input Validation** - Sanitize all user inputs
- **Session Management** - Set expiration times

---

## Lesson 5.2: Setting Up Password Utilities

We need secure password hashing. Let's create password utilities.

### Step 1: Create Password Utility Functions

Create `lib/password-utils.ts`:

```typescript
import crypto from 'crypto'

/**
 * Hash a password using SHA-256
 * In production, consider using bcrypt for better security
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  const passwordHash = hashPassword(password)
  return passwordHash === hash
}

/**
 * Generate a secure random password (for password reset, etc.)
 */
export function generateSecurePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const randomBytes = crypto.randomBytes(length)
  let password = ''
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length]
  }
  
  return password
}
```

**Note**: For production, consider using `bcrypt` instead of SHA-256 for better security. For this course, SHA-256 is simpler and sufficient for learning.

### Step 2: Install bcrypt (Optional, Recommended for Production)

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

If using bcrypt, update the password utilities:

```typescript
import bcrypt from 'bcrypt'

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}
```

✅ **Checkpoint**: Password utilities should be created!

---

## Lesson 5.3: Creating User Registration

Let's create the registration system.

### Step 1: Create Registration API Endpoint

Create `app/api/client/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { hashPassword } from '@/lib/password-utils'
import { sanitizeEmail, sanitizeText } from '@/lib/input-validation'
import crypto from 'crypto'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  passwordHash: string
  createdAt: string
  lastLoginAt?: string
  isActive: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email: rawEmail, password, name: rawName, phone: rawPhone } = body

    // Validate required fields
    if (!rawEmail || !password || !rawName) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    let email: string
    let name: string
    let phone: string | undefined

    try {
      email = sanitizeEmail(rawEmail)
      name = sanitizeText(rawName)
      phone = rawPhone ? sanitizeText(rawPhone) : undefined
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Invalid input format' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Load existing users
    const usersData = await readDataFile<{ users: User[] }>('users.json', { users: [] })

    // Check if user already exists
    const existingUser = usersData.users.find(
      (u) => u.email.toLowerCase().trim() === normalizedEmail
    )

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = hashPassword(password)

    // Create new user
    const newUser: User = {
      id: `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      email: normalizedEmail,
      name: name.trim(),
      phone: phone?.trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      isActive: true,
    }

    // Add user to database
    usersData.users.push(newUser)
    await writeDataFile('users.json', usersData)

    // Return success (don't return password hash!)
    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        message: 'Account created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
```

### Step 2: Create Registration Page

Create `app/account/register/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)

    // Validate form
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/client/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Registration successful - redirect to login
        router.push('/account/login?registered=true')
      } else {
        setErrors({ submit: data.error || 'Registration failed' })
      }
    } catch (error) {
      setErrors({ submit: 'An error occurred. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create an Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/account/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
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
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

✅ **Checkpoint**: Registration should work!

---

## Lesson 5.4: Creating Login System

Now let's create the login functionality.

### Step 1: Create Login API Endpoint

Create `app/api/client/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { verifyPassword } from '@/lib/password-utils'
import { sanitizeEmail } from '@/lib/input-validation'

interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  isActive: boolean
  lastLoginAt?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email: rawEmail, password } = body

    if (!rawEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Sanitize email
    let email: string
    try {
      email = sanitizeEmail(rawEmail)
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Load users
    const usersData = await readDataFile<{ users: User[] }>('users.json', { users: [] })

    // Find user
    const user = usersData.users.find(
      (u) => u.email.toLowerCase().trim() === normalizedEmail && u.isActive
    )

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString()
    await writeDataFile('users.json', usersData)

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
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
      maxAge: 60 * 60 * 24 * 30, // 30 days
    }

    response.cookies.set('client-auth', 'authenticated', cookieOptions)
    response.cookies.set('client-user-id', user.id, cookieOptions)
    response.cookies.set('client-last-active', String(Date.now()), cookieOptions)

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    )
  }
}
```

### Step 2: Create Login Page

Create `app/account/login/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setRegistered(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/client/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include', // Important for cookies
      })

      const data = await response.json()

      if (response.ok) {
        // Login successful - redirect to account dashboard
        router.push('/account')
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
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/account/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        {registered && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            Account created successfully! Please sign in.
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

✅ **Checkpoint**: Login should work!

---

## Lesson 5.5: Creating Authentication Helpers

We need helper functions to check authentication status.

### Step 1: Create Authentication Helper

Create `lib/client-auth.ts`:

```typescript
import { cookies } from 'next/headers'

export const CLIENT_AUTH_COOKIE = 'client-auth'
export const CLIENT_USER_COOKIE = 'client-user-id'
export const CLIENT_LAST_ACTIVE_COOKIE = 'client-last-active'
export const CLIENT_SESSION_MAX_IDLE_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

type ClientSession = {
  userId: string
  lastActive: number
}

const loadClientSession = (): ClientSession | null => {
  const cookieStore = cookies()
  const authCookie = cookieStore.get(CLIENT_AUTH_COOKIE)?.value
  
  if (authCookie !== 'authenticated') {
    return null
  }

  const userId = cookieStore.get(CLIENT_USER_COOKIE)?.value
  if (!userId) {
    return null
  }

  const lastActiveRaw = cookieStore.get(CLIENT_LAST_ACTIVE_COOKIE)?.value
  const lastActive = lastActiveRaw ? Number(lastActiveRaw) : NaN
  
  if (!Number.isFinite(lastActive)) {
    return null
  }

  // Check if session expired
  if (Date.now() - lastActive > CLIENT_SESSION_MAX_IDLE_MS) {
    return null
  }

  return {
    userId,
    lastActive,
  }
}

export async function isClientAuthenticated(): Promise<boolean> {
  return Boolean(loadClientSession())
}

export async function getClientUserId(): Promise<string | null> {
  const session = loadClientSession()
  return session?.userId || null
}

export async function requireClientAuth() {
  const authenticated = await isClientAuthenticated()
  if (!authenticated) {
    throw new Error('Unauthorized')
  }
}
```

### Step 2: Create "Get Current User" API

Create `app/api/client/auth/me/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getClientUserId } from '@/lib/client-auth'
import { readDataFile } from '@/lib/data-utils'

export async function GET(request: NextRequest) {
  try {
    const userId = await getClientUserId()

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Load user data
    const usersData = await readDataFile<{ users: any[] }>('users.json', { users: [] })
    const user = usersData.users.find((u) => u.id === userId && u.isActive)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Return user data (without password hash!)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    })
  } catch (error: any) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get user' },
      { status: 500 }
    )
  }
}
```

✅ **Checkpoint**: Authentication helpers should work!

---

## Lesson 5.6: Creating Client Dashboard

Now let's create a dashboard where clients can view their bookings.

### Step 1: Create Dashboard Page

Create `app/account/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { getClientUserId } from '@/lib/client-auth'
import { readDataFile } from '@/lib/data-utils'
import Link from 'next/link'

export default async function AccountDashboard() {
  const userId = await getClientUserId()

  if (!userId) {
    redirect('/account/login')
  }

  // Load user data
  const usersData = await readDataFile<{ users: any[] }>('users.json', { users: [] })
  const user = usersData.users.find((u) => u.id === userId)

  if (!user) {
    redirect('/account/login')
  }

  // Load user's bookings
  const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
  const userBookings = bookingsData.bookings
    .filter((b) => b.email?.toLowerCase() === user.email.toLowerCase())
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.timeSlot || '00:00'}`)
      const dateB = new Date(`${b.date}T${b.timeSlot || '00:00'}`)
      return dateB.getTime() - dateA.getTime() // Most recent first
    })

  const upcomingBookings = userBookings.filter((b) => {
    const bookingDate = new Date(`${b.date}T${b.timeSlot || '00:00'}`)
    return bookingDate >= new Date()
  })

  const pastBookings = userBookings.filter((b) => {
    const bookingDate = new Date(`${b.date}T${b.timeSlot || '00:00'}`)
    return bookingDate < new Date()
  })

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user.name}!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Profile</h2>
              <div className="space-y-2">
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                {user.phone && <p><strong>Phone:</strong> {user.phone}</p>}
              </div>
              <Link
                href="/account/logout"
                className="mt-4 inline-block text-sm text-red-600 hover:text-red-700"
              >
                Sign Out
              </Link>
            </div>
          </div>

          {/* Bookings Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Bookings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
              {upcomingBookings.length === 0 ? (
                <p className="text-gray-500">No upcoming appointments</p>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{booking.serviceName || 'Service'}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.date).toLocaleDateString()} at {booking.timeSlot}
                          </p>
                          {booking.status && (
                            <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {booking.status}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {booking.price && (
                            <p className="font-semibold">KES {booking.price.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Bookings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Past Appointments</h2>
              {pastBookings.length === 0 ? (
                <p className="text-gray-500">No past appointments</p>
              ) : (
                <div className="space-y-4">
                  {pastBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{booking.serviceName || 'Service'}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.date).toLocaleDateString()} at {booking.timeSlot}
                          </p>
                        </div>
                        <div className="text-right">
                          {booking.price && (
                            <p className="font-semibold">KES {booking.price.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link
                  href="/booking"
                  className="block w-full text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Book New Appointment
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Step 2: Create Logout Endpoint

Create `app/api/client/auth/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })

  // Clear authentication cookies
  response.cookies.delete('client-auth')
  response.cookies.delete('client-user-id')
  response.cookies.delete('client-last-active')

  return response
}
```

### Step 3: Create Logout Page

Create `app/account/logout/page.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    async function logout() {
      await fetch('/api/client/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      router.push('/account/login')
    }
    logout()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg">Signing out...</p>
      </div>
    </div>
  )
}
```

✅ **Checkpoint**: Client dashboard should work!

---

## Module 5 Checkpoint

Before moving to Module 6, make sure you have:

✅ Created password utilities  
✅ Created registration system  
✅ Created login system  
✅ Created authentication helpers  
✅ Created client dashboard  
✅ Created logout functionality  
✅ Tested registration and login  
✅ Tested protected routes  

### Common Issues & Solutions

**Problem**: "Not authenticated" errors  
**Solution**: Make sure cookies are being set with `credentials: 'include'` in fetch requests

**Problem**: Session expires too quickly  
**Solution**: Check `CLIENT_SESSION_MAX_IDLE_MS` value in `client-auth.ts`

**Problem**: Password not working after registration  
**Solution**: Verify password hashing is consistent between registration and login

**Problem**: Cookies not persisting  
**Solution**: Check cookie settings (httpOnly, secure, sameSite) match your environment

---

## What's Next?

Congratulations! You've added client authentication. You now have:
- ✅ User registration
- ✅ Login system
- ✅ Session management
- ✅ Client dashboard
- ✅ Booking history
- ✅ Protected routes

**Ready for Module 6?**  
Open `MODULE_06_ADMIN_DASHBOARD.md` to create the admin panel!

---

## Practice Exercise

Before moving on, try these exercises:

1. **Add password reset** - Create "Forgot Password" functionality
2. **Add profile editing** - Allow users to update their name and phone
3. **Add booking cancellation** - Let users cancel upcoming bookings
4. **Add email verification** - Send verification email on registration
5. **Add remember me** - Extend session duration option

