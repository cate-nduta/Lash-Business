import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { LabsSettings } from '@/app/api/labs/settings/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST - Validate discount code for consultation booking
 * This validates waitlist discount codes that were sent to users who signed up for the waitlist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { valid: false, error: 'Discount code is required' },
        { status: 400 }
      )
    }

    // Load labs settings to check if discount section is enabled
    const settings = await readDataFile<LabsSettings>('labs-settings.json', {
      discountSectionEnabled: false,
    })

    // Check if discount section is enabled
    if (!settings.discountSectionEnabled) {
      return NextResponse.json(
        { valid: false, error: 'Discount codes are currently disabled' },
        { status: 400 }
      )
    }

    // Load waitlist settings to get discount percentage
    const waitlistSettings = await readDataFile<{
      discountPercentage: number
      discountCodePrefix: string
      enabled: boolean
    }>('labs-waitlist-settings.json', {
      discountPercentage: 0,
      discountCodePrefix: 'WAITLIST',
      enabled: false,
    })

    // Check if waitlist discount is enabled
    if (!waitlistSettings.enabled || waitlistSettings.discountPercentage <= 0) {
      return NextResponse.json(
        { valid: false, error: 'Waitlist discount is not currently active' },
        { status: 400 }
      )
    }

    // Load waitlist entries to find matching discount code
    const waitlistData = await readDataFile<{
      entries: Array<{
        email: string
        signedUpAt: string
        discountCode?: string
        discountCodeExpiresAt?: string
      }>
    }>('labs-waitlist.json', { entries: [] })

    // Find entry with matching discount code (case-insensitive)
    const normalizedCode = code.trim().toUpperCase()
    const entry = waitlistData.entries.find(
      (e: any) => e.discountCode && e.discountCode.toUpperCase() === normalizedCode
    )

    if (!entry) {
      return NextResponse.json(
        { valid: false, error: 'Invalid discount code' },
        { status: 400 }
      )
    }

    // Check if discount code has expired (28 days from signup)
    if (entry.discountCodeExpiresAt) {
      const expirationDate = new Date(entry.discountCodeExpiresAt)
      const now = new Date()

      if (now > expirationDate) {
        return NextResponse.json(
          { valid: false, error: 'This discount code has expired. Discount codes are valid for 28 days from signup.' },
          { status: 400 }
        )
      }
    }

    // Code is valid - return waitlist discount percentage
    return NextResponse.json({
      valid: true,
      discountType: 'percentage',
      discountValue: waitlistSettings.discountPercentage,
      code: entry.discountCode,
    })
  } catch (error: any) {
    console.error('Error validating discount code:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate discount code' },
      { status: 500 }
    )
  }
}
