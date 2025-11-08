import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/invite']

function isPublicAdminPath(pathname: string) {
  return PUBLIC_ADMIN_PATHS.some((publicPath) => pathname.startsWith(publicPath))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const isAuthenticated = request.cookies.get('admin-auth')?.value === 'authenticated'
  const isPublic = isPublicAdminPath(pathname)

  if (!isAuthenticated && !isPublic) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}

