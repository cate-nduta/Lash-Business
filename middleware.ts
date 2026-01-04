import { NextResponse, type NextRequest } from 'next/server'
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_LAST_ACTIVE_COOKIE,
  ADMIN_SESSION_MAX_IDLE_MS,
  ADMIN_USER_COOKIE,
} from '@/lib/admin-auth'

const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control': 'off',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://via.placeholder.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://www.google-analytics.com https://maps.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ].join('; '),
}

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60

type RateLimitEntry = { count: number; expires: number }

const rateLimitStore =
  (globalThis as typeof globalThis & { __ADMIN_RATE_LIMIT__?: Map<string, RateLimitEntry> })
    .__ADMIN_RATE_LIMIT__ ?? new Map<string, RateLimitEntry>()

;(globalThis as typeof globalThis & { __ADMIN_RATE_LIMIT__?: Map<string, RateLimitEntry> })
  .__ADMIN_RATE_LIMIT__ = rateLimitStore

const applySecurityHeaders = (response: NextResponse) => {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  return response
}

const getClientIdentifier = (request: NextRequest) =>
  request.ip ||
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('cf-connecting-ip') ||
  'unknown'

const applyRateLimit = (identifier: string) => {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || entry.expires <= now) {
    rateLimitStore.set(identifier, { count: 1, expires: now + RATE_LIMIT_WINDOW_MS })
    return { limited: false as const }
  }

  entry.count += 1

  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return {
      limited: true as const,
      retryAfter: Math.max(1, Math.ceil((entry.expires - now) / 1000)),
    }
  }

  return { limited: false as const }
}

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/invite']
const PUBLIC_ADMIN_API_PATHS = ['/api/admin/login']

const isPublicAdminPath = (pathname: string) =>
  PUBLIC_ADMIN_PATHS.some((publicPath) => pathname.startsWith(publicPath))

const isPublicAdminApiPath = (pathname: string) =>
  PUBLIC_ADMIN_API_PATHS.some((publicPath) => pathname.startsWith(publicPath))

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for Next.js internal paths and static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next()
  }
  
  const isAdminPage = pathname.startsWith('/admin')
  const isAdminApi = pathname.startsWith('/api/admin')

  if (isAdminApi) {
    const identifier = `${getClientIdentifier(request)}:${pathname}`
    const rateLimitResult = applyRateLimit(identifier)

    if (rateLimitResult.limited) {
      const retryAfter = rateLimitResult.retryAfter?.toString() ?? '60'
      const limitedResponse = NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
      limitedResponse.headers.set('Retry-After', retryAfter)
      return applySecurityHeaders(limitedResponse)
    }
  }

  if (!isAdminPage && !isAdminApi) {
    return applySecurityHeaders(NextResponse.next())
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
        return applySecurityHeaders(response)
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
      return applySecurityHeaders(response)
    }

    if (hasAuthCookies) {
      const response = NextResponse.next()
      response.cookies.delete(ADMIN_AUTH_COOKIE)
      response.cookies.delete(ADMIN_USER_COOKIE)
      response.cookies.delete(ADMIN_LAST_ACTIVE_COOKIE)
      return applySecurityHeaders(response)
    }

    return applySecurityHeaders(NextResponse.next())
  }

  if (isAdminPage && pathname === '/admin/login') {
    const response = NextResponse.redirect(new URL('/admin/dashboard', request.url))
    response.cookies.set(ADMIN_AUTH_COOKIE, 'authenticated', cookieOptions)
    response.cookies.set(ADMIN_LAST_ACTIVE_COOKIE, String(now), cookieOptions)
    response.cookies.set(ADMIN_USER_COOKIE, userCookie, cookieOptions)
    return applySecurityHeaders(response)
  }

  const response = NextResponse.next()
  response.cookies.set(ADMIN_AUTH_COOKIE, 'authenticated', cookieOptions)
  response.cookies.set(ADMIN_LAST_ACTIVE_COOKIE, String(now), cookieOptions)
  response.cookies.set(ADMIN_USER_COOKIE, userCookie, cookieOptions)
  return applySecurityHeaders(response)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

