import { NextRequest, NextResponse } from 'next/server'
import { verifyTransaction } from '@/lib/paystack-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Verify a Paystack transaction
 * GET /api/paystack/verify?reference=xxx
 * POST /api/paystack/verify (with body containing reference, orderId, paymentType)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference, orderId, paymentType } = body

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

    // For Labs tier payments, the webhook will handle the rest
    // Just return success here
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

