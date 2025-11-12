import { NextResponse } from 'next/server'
import { ADMIN_AUTH_COOKIE, ADMIN_LAST_ACTIVE_COOKIE, ADMIN_USER_COOKIE } from '@/lib/admin-auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(ADMIN_AUTH_COOKIE)
  response.cookies.delete(ADMIN_USER_COOKIE)
  response.cookies.delete(ADMIN_LAST_ACTIVE_COOKIE)
  return response
}

