import { NextResponse, type NextRequest } from 'next/server'
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_LAST_ACTIVE_COOKIE,
  ADMIN_SESSION_MAX_IDLE_MS,
  ADMIN_USER_COOKIE,
} from '@/lib/admin-auth'

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/invite']
const PUBLIC_ADMIN_API_PATHS = ['/api/admin/login']

const isPublicAdminPath = (pathname: string) =>
  PUBLIC_ADMIN_PATHS.some((publicPath) => pathname.startsWith(publicPath))

const isPublicAdminApiPath = (pathname: string) =>
  PUBLIC_ADMIN_API_PATHS.some((publicPath) => pathname.startsWith(publicPath))

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminPage = pathname.startsWith('/admin')
  const isAdminApi = pathname.startsWith('/api/admin')

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get(ADMIN_AUTH_COOKIE)?.value
  const lastActiveRaw = request.cookies.get(ADMIN_LAST_ACTIVE_COOKIE)?.value
  const userCookie = request.cookies.get(ADMIN_USER_COOKIE)?.value || 'owner'

  const now = Date.now()
  const lastActive = lastActiveRaw ? Number(lastActiveRaw) : NaN

  const isAuthenticated =
    authCookie === 'authenticated' &&
    Number.isFinite(lastActive) &&
    now - lastActive <= ADMIN_SESSION_MAX_IDLE_MS

  const isPublic = isAdminPage ? isPublicAdminPath(pathname) : isPublicAdminApiPath(pathname)

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: Math.floor(ADMIN_SESSION_MAX_IDLE_MS / 1000),
  }

  if (!isAuthenticated) {
    const hasAuthCookies = Boolean(authCookie || lastActiveRaw)

    if (!isPublic) {
      if (isAdminApi) {
        const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (hasAuthCookies) {
          response.cookies.delete(ADMIN_AUTH_COOKIE)
          response.cookies.delete(ADMIN_USER_COOKIE)
          response.cookies.delete(ADMIN_LAST_ACTIVE_COOKIE)
        }
        return response
      }
      const loginUrl = new URL('/admin/login', request.url)
      if (isAdminPage) {
        loginUrl.searchParams.set('redirect', pathname)
      }
      const response = NextResponse.redirect(loginUrl)
      if (hasAuthCookies) {
        response.cookies.delete(ADMIN_AUTH_COOKIE)
        response.cookies.delete(ADMIN_USER_COOKIE)
        response.cookies.delete(ADMIN_LAST_ACTIVE_COOKIE)
      }
      return response
    }

    if (hasAuthCookies) {
      const response = NextResponse.next()
      response.cookies.delete(ADMIN_AUTH_COOKIE)
      response.cookies.delete(ADMIN_USER_COOKIE)
      response.cookies.delete(ADMIN_LAST_ACTIVE_COOKIE)
      return response
    }

    return NextResponse.next()
  }

  if (isAdminPage && pathname === '/admin/login') {
    const response = NextResponse.redirect(new URL('/admin/dashboard', request.url))
    response.cookies.set(ADMIN_AUTH_COOKIE, 'authenticated', cookieOptions)
    response.cookies.set(ADMIN_LAST_ACTIVE_COOKIE, String(now), cookieOptions)
    response.cookies.set(ADMIN_USER_COOKIE, userCookie, cookieOptions)
    return response
  }

  const response = NextResponse.next()
  response.cookies.set(ADMIN_AUTH_COOKIE, 'authenticated', cookieOptions)
  response.cookies.set(ADMIN_LAST_ACTIVE_COOKIE, String(now), cookieOptions)
  response.cookies.set(ADMIN_USER_COOKIE, userCookie, cookieOptions)
  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

