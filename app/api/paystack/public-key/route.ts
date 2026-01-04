import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Get Paystack public key for frontend
 * GET /api/paystack/public-key
 * 
 * Returns the Paystack public key for use in frontend payment forms
 */
export async function GET(request: NextRequest) {
  try {
    // Get public key from environment variables
    // Try both test and live keys
    const publicKey = 
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 
      process.env.PAYSTACK_PUBLIC_KEY || 
      process.env.PAYSTACK_PUBLIC_KEY_LIVE || 
      ''

    if (!publicKey) {
      return NextResponse.json(
        { 
          error: 'Paystack public key not configured',
          message: 'Please add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to your environment variables'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      publicKey,
    })
  } catch (error: any) {
    console.error('Error getting Paystack public key:', error)
    return NextResponse.json(
      { error: 'Failed to get public key' },
      { status: 500 }
    )
  }
}

