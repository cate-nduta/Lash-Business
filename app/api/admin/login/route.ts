import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readDataFile } from '@/lib/data-utils'
import { verifyPassword } from '@/lib/password-utils'

// IMPORTANT: Set ADMIN_PASSWORD in .env.local file for security
// Default password is only for development - CHANGE IT IN PRODUCTION!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'lashdiary2025'

export async function POST(request: NextRequest) {
  try {
    const { password, username } = await request.json()

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
          role: admin.role 
        })
        response.cookies.set('admin-auth', 'authenticated', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
        response.cookies.set('admin-user', admin.username, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
        return response
      }
    } catch (error) {
      // If admins.json doesn't exist or has issues, fall back to env password
      console.log('Multi-admin not available, using env password')
    }

    // Fallback to original single password method (for backward compatibility)
    if (password === ADMIN_PASSWORD) {
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

