import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_LAST_ACTIVE_COOKIE,
  ADMIN_SESSION_MAX_IDLE_MS,
  ADMIN_USER_COOKIE,
} from '@/lib/admin-auth'

export async function GET() {
  const cookieStore = cookies()
  const authCookie = cookieStore.get(ADMIN_AUTH_COOKIE)?.value
  const lastActiveRaw = cookieStore.get(ADMIN_LAST_ACTIVE_COOKIE)?.value

  const now = Date.now()
  const lastActive = lastActiveRaw ? Number(lastActiveRaw) : NaN

  const valid =
    authCookie === 'authenticated' &&
    Number.isFinite(lastActive) &&
    now - lastActive <= ADMIN_SESSION_MAX_IDLE_MS

  if (!valid) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 })
    response.cookies.delete(ADMIN_AUTH_COOKIE)
    response.cookies.delete(ADMIN_USER_COOKIE)
    response.cookies.delete(ADMIN_LAST_ACTIVE_COOKIE)
    return response
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: Math.floor(ADMIN_SESSION_MAX_IDLE_MS / 1000),
  }

  const response = NextResponse.json({ authenticated: true })
  response.cookies.set(ADMIN_AUTH_COOKIE, 'authenticated', cookieOptions)
  response.cookies.set(ADMIN_LAST_ACTIVE_COOKIE, String(now), cookieOptions)
  return response
}

