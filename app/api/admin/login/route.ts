import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// IMPORTANT: Set ADMIN_PASSWORD in .env.local file for security
// Default password is only for development - CHANGE IT IN PRODUCTION!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'lashdiary2025'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (password === ADMIN_PASSWORD) {
      // Set a simple session cookie (in production, use proper session management)
      const response = NextResponse.json({ success: true })
      response.cookies.set('admin-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      return response
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}

