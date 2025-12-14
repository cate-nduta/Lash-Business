import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const users = await readDataFile<any[]>('users.json', [])
    const user = users.find(u => u.email === email.toLowerCase() && u.labsAccess)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Hash password and compare
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')
    
    if (user.password !== hashedPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create session
    const sessionData = {
      email: user.email,
      userId: user.id,
      orderId: user.labsOrderId,
    }

    const sessionCookie = encodeURIComponent(JSON.stringify(sessionData))

    // Set cookie (in production, use httpOnly, secure, sameSite)
    const response = NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        orderId: user.labsOrderId,
      },
    })

    response.cookies.set('labs-session', sessionCookie, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
      // secure: true, // Enable in production with HTTPS
      // httpOnly: true, // Enable in production
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}

