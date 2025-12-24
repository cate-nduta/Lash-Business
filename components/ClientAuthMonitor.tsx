'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// Dashboard-related routes that should keep the user logged in
const DASHBOARD_ROUTES = [
  '/account/dashboard',
  '/account/maps',
  '/account/history',
  '/account/login',
  '/account/register',
]

export default function ClientAuthMonitor() {
  const pathname = usePathname()
  const lastPathnameRef = useRef<string | null>(null)
  const isCheckingRef = useRef(false)

  useEffect(() => {
    // Skip if already checking or if pathname hasn't changed
    if (isCheckingRef.current || lastPathnameRef.current === pathname) {
      return
    }

    // Skip check if already on a dashboard route (no need to check)
    const isOnDashboardRoute = DASHBOARD_ROUTES.some((route) =>
      pathname?.startsWith(route)
    )

    if (isOnDashboardRoute) {
      lastPathnameRef.current = pathname
      return // No need to check or logout if on dashboard route
    }

    isCheckingRef.current = true
    lastPathnameRef.current = pathname

    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/client/auth/me', {
          cache: 'no-store',
          credentials: 'include',
        })
        // 401 is expected when not logged in - not an error
        const isAuthenticated = response.ok

        if (isAuthenticated) {
          // User is authenticated but not on a dashboard route - log them out
          await fetch('/api/client/auth/logout', { method: 'POST' })
          // The Navbar will automatically update to show login button
        }
      } catch (error) {
        // Silently fail - don't interrupt user experience
        // Network errors are handled here, 401 responses are expected and handled above
      } finally {
        // Reset the checking flag after a delay
        setTimeout(() => {
          isCheckingRef.current = false
        }, 500)
      }
    }

    checkAuth()
  }, [pathname])

  return null // This component doesn't render anything
}

