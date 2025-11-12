import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { verifyPassword } from '@/lib/password-utils'
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_LAST_ACTIVE_COOKIE,
  ADMIN_SESSION_MAX_IDLE_MS,
  ADMIN_USER_COOKIE,
} from '@/lib/admin-auth'

// IMPORTANT: Set ADMIN_PASSWORD in .env.local file for security
// Default password is only for development - CHANGE IT IN PRODUCTION!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'lashdiary2025'

export async function POST(request: NextRequest) {
  try {
    const { password, username } = await request.json()
    const now = Date.now()

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: Math.floor(ADMIN_SESSION_MAX_IDLE_MS / 1000),
    }

    // Try multi-admin login first
    try {
      const data = await readDataFile<{ admins: any[] }>('admins.json', { admins: [] })
      const admins = data.admins || []
      
      // Check if any admin credentials match
      const admin = admins.find(admin => 
        admin && (admin.username === username || admin.email === username)
      )

      if (admin) {
        let isValid = false

        if (admin.passwordHash) {
          isValid = verifyPassword(password, admin.passwordHash)
        } else if (admin.password) {
          isValid = admin.password === password
        }

        if (!isValid) {
          return NextResponse.json(
            { success: false, error: 'Invalid credentials' },
            { status: 401 }
          )
        }

        const response = NextResponse.json({
          success: true,
          username: admin.username,
          role: admin.role,
        })
        response.cookies.set(ADMIN_AUTH_COOKIE, 'authenticated', cookieOptions)
        response.cookies.set(ADMIN_USER_COOKIE, admin.username, cookieOptions)
        response.cookies.set(ADMIN_LAST_ACTIVE_COOKIE, String(now), cookieOptions)
        return response
      }
    } catch (error) {
      // If admins.json doesn't exist or has issues, fall back to env password
      console.log('Multi-admin not available, using env password')
    }

    // Fallback to original single password method (for backward compatibility)
    if (password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true })
      response.cookies.set(ADMIN_AUTH_COOKIE, 'authenticated', cookieOptions)
      response.cookies.set(ADMIN_USER_COOKIE, 'owner', cookieOptions)
      response.cookies.set(ADMIN_LAST_ACTIVE_COOKIE, String(now), cookieOptions)
      return response
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
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

