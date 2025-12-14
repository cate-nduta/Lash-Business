import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Find user by order ID
    const users = await readDataFile<any[]>('users.json', [])
    const user = users.find(u => u.labsOrderId === orderId && u.labsAccess)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found for this order' },
        { status: 404 }
      )
    }

    // Create session
    const sessionData = {
      email: user.email,
      userId: user.id,
      orderId: user.labsOrderId,
    }

    const sessionCookie = encodeURIComponent(JSON.stringify(sessionData))

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
    console.error('Auto-login error:', error)
    return NextResponse.json(
      { error: 'Failed to auto-login' },
      { status: 500 }
    )
  }
}

