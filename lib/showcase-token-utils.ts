/**
 * Utility functions for generating and parsing showcase booking tokens
 */

/**
 * Generates a readable showcase booking token in the format: {name}{date}-showcase-meeting
 * Example: james192026-showcase-meeting (for James, ordered on 1/9/2026)
 * Date format: day + month + year (full 4 digits), e.g., 1/9/2026 -> 192026
 */
export function generateShowcaseToken(name: string, createdAt: string): string {
  // Normalize name: lowercase, remove spaces and special characters, keep only alphanumeric
  const normalizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20) // Limit length to avoid very long URLs

  // Extract date from ISO string (e.g., "2026-01-09T10:30:00.000Z")
  const date = new Date(createdAt)
  const day = date.getDate()
  const month = date.getMonth() + 1 // getMonth() returns 0-11
  const year = date.getFullYear() // Full 4-digit year

  // Format: day + month + year (e.g., 1/9/2026 -> 192026)
  const datePart = `${day}${month}${year}`

  return `${normalizedName}${datePart}-showcase-meeting`
}

/**
 * Checks if a token is in the old hex format (64 characters, hexadecimal)
 */
export function isHexToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token)
}

/**
 * Checks if a token is in the new readable format
 * Format: {name}{date}-showcase-meeting where date is day + month + year (4 digits)
 * Example: james192026-showcase-meeting
 */
export function isReadableToken(token: string): boolean {
  return /^[a-z0-9]+[0-9]+-showcase-meeting$/i.test(token)
}

