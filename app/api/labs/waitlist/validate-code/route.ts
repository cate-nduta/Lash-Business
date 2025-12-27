import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Validate waitlist discount code (also supports GET for backwards compatibility)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = body.code

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Discount code is required' },
        { status: 200 }
      )
    }

    // Load waitlist settings and entries
    const waitlistSettings = await readDataFile<any>(
      'labs-waitlist-settings.json',
      { discountPercentage: 0, discountCodePrefix: 'WAITLIST', enabled: false }
    )

    const waitlistData = await readDataFile<any>(
      'labs-waitlist.json',
      { entries: [] }
    )

    // Find entry with matching discount code
    const entry = waitlistData.entries.find(
      (e: any) => e.discountCode && e.discountCode.toUpperCase() === code.toUpperCase().trim()
    )

    if (!entry) {
      return NextResponse.json(
        { valid: false, error: 'Invalid discount code' },
        { status: 200 }
      )
    }

    // Check if discount code has expired (28 days from signup)
    if (entry.discountCodeExpiresAt) {
      const expirationDate = new Date(entry.discountCodeExpiresAt)
      const now = new Date()
      if (now > expirationDate) {
        return NextResponse.json(
          { valid: false, error: 'This discount code has expired. Discount codes are valid for 28 days from signup.' },
          { status: 200 }
        )
      }
    }

    // Check if waitlist discount is enabled and percentage > 0
    if (!waitlistSettings.enabled || waitlistSettings.discountPercentage <= 0) {
      return NextResponse.json(
        { valid: false, error: 'Discount is not currently available' },
        { status: 200 }
      )
    }

    return NextResponse.json({
      valid: true,
      discountPercentage: waitlistSettings.discountPercentage,
      discountCode: entry.discountCode,
    })
  } catch (error: any) {
    console.error('Error validating discount code:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate discount code' },
      { status: 500 }
    )
  }
}

// GET - Validate waitlist discount code (for backwards compatibility)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Discount code is required' },
        { status: 200 }
      )
    }

    // Load waitlist settings and entries
    const waitlistSettings = await readDataFile<any>(
      'labs-waitlist-settings.json',
      { discountPercentage: 0, discountCodePrefix: 'WAITLIST', enabled: false }
    )

    const waitlistData = await readDataFile<any>(
      'labs-waitlist.json',
      { entries: [] }
    )

    // Find entry with matching discount code
    const entry = waitlistData.entries.find(
      (e: any) => e.discountCode && e.discountCode.toUpperCase() === code.toUpperCase().trim()
    )

    if (!entry) {
      return NextResponse.json(
        { valid: false, error: 'Invalid discount code' },
        { status: 200 }
      )
    }

    // Check if discount code has expired (28 days from signup)
    if (entry.discountCodeExpiresAt) {
      const expirationDate = new Date(entry.discountCodeExpiresAt)
      const now = new Date()
      if (now > expirationDate) {
        return NextResponse.json(
          { valid: false, error: 'This discount code has expired. Discount codes are valid for 28 days from signup.' },
          { status: 200 }
        )
      }
    }

    // Check if waitlist discount is enabled and percentage > 0
    if (!waitlistSettings.enabled || waitlistSettings.discountPercentage <= 0) {
      return NextResponse.json(
        { valid: false, error: 'Discount is not currently available' },
        { status: 200 }
      )
    }

    return NextResponse.json({
      valid: true,
      discountPercentage: waitlistSettings.discountPercentage,
      discountCode: entry.discountCode,
    })
  } catch (error: any) {
    console.error('Error validating discount code:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate discount code' },
      { status: 500 }
    )
  }
}
