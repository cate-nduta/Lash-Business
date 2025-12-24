import { NextRequest, NextResponse } from 'next/server'
import { verifyTransaction } from '@/lib/paystack-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Verify a Paystack transaction
 * GET /api/paystack/verify?reference=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference is required' },
        { status: 400 }
      )
    }

    // Verify transaction
    const result = await verifyTransaction(reference)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Transaction verification failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
    })
  } catch (error: any) {
    console.error('Error in Paystack verify endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to verify transaction' },
      { status: 500 }
    )
  }
}

