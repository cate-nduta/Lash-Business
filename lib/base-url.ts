/**
 * Centralized base URL utility
 * Ensures all URLs use the production domain (lashdiary.co.ke) in production
 * and localhost only in development when explicitly set
 */

/**
 * Get the base URL for server-side code
 * Always defaults to production domain (lashdiary.co.ke) unless explicitly set
 */
export function getBaseUrl(): string {
  // Check environment variables in order of preference
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ''

  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    // If it already has a protocol, use it as-is
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    // Otherwise, add https://
    return `https://${trimmed}`
  }

  // Always default to production domain - never localhost
  return 'https://lashdiary.co.ke'
}

/**
 * Get the base URL for client-side code
 * Uses window.location.origin in browser, falls back to server-side logic
 */
export function getClientBaseUrl(): string {
  // In browser, use current origin (will be lashdiary.co.ke in production)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Server-side: use the same logic as getBaseUrl
  return getBaseUrl()
}

/**
 * Normalize a base URL string (used in various API routes)
 * Ensures consistent formatting and always defaults to production domain
 */
export function normalizeBaseUrl(): string {
  return getBaseUrl()
}

