import { NextResponse } from 'next/server'
import { getAdminUser, isAdminAuthenticated } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated()
    
    if (!authenticated) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    const user = await getAdminUser()
    
    return NextResponse.json({
      authenticated: true,
      user: user || { username: 'owner', role: 'owner' },
    })
  } catch (error) {
    console.error('Error checking admin auth:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }
}
