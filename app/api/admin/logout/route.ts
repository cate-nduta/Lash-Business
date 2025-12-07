import { NextResponse } from 'next/server'
import { ADMIN_AUTH_COOKIE, ADMIN_LAST_ACTIVE_COOKIE, ADMIN_USER_COOKIE } from '@/lib/admin-auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  
  // Delete cookies by setting them with expired date and same options as login
  // This ensures they're properly deleted even if set with specific path/domain
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 0, // Expire immediately
  }
  
  response.cookies.set(ADMIN_AUTH_COOKIE, '', cookieOptions)
  response.cookies.set(ADMIN_USER_COOKIE, '', cookieOptions)
  response.cookies.set(ADMIN_LAST_ACTIVE_COOKIE, '', cookieOptions)
  
  // Also try delete method as fallback
  response.cookies.delete(ADMIN_AUTH_COOKIE)
  response.cookies.delete(ADMIN_USER_COOKIE)
  response.cookies.delete(ADMIN_LAST_ACTIVE_COOKIE)
  
  return response
}

