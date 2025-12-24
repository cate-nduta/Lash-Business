import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { verifyPassword } from '@/lib/password-utils'
import { sanitizeEmail } from '@/lib/input-validation'
import type { ClientUsersData } from '@/types/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email: rawEmail, password: rawPassword } = body

    if (!rawEmail || !rawPassword) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

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
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })

    const user = usersData.users.find(
      (u) => u.email.toLowerCase().trim() === normalizedEmail && u.isActive
    )

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user has a password set
    if (!user.passwordHash || user.passwordHash.length === 0) {
      return NextResponse.json(
        { error: 'No password set for this account. Please check your email for the password sent when you purchased the course.' },
        { status: 401 }
      )
    }

    const isValidPassword = verifyPassword(rawPassword.toString(), user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Set authentication cookies (same as client auth but for course students)
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
    console.error('Course student login error:', error)
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    )
  }
}

