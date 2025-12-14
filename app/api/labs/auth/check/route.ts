import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('labs-session')
    
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false })
    }

    // In a real implementation, you'd verify the session token
    // For now, we'll check if the user exists
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie.value))
    const users = await readDataFile<any[]>('users.json', [])
    const user = users.find(u => u.email === sessionData.email && u.labsAccess)

    if (!user) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: user.email,
        name: user.name,
        orderId: user.labsOrderId,
      },
      orderId: user.labsOrderId,
    })
  } catch (error) {
    return NextResponse.json({ authenticated: false })
  }
}

