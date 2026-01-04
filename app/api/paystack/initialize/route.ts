import { NextRequest, NextResponse } from 'next/server'
import { initializeTransaction, type InitializeTransactionParams } from '@/lib/paystack-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Initialize a Paystack transaction
 * POST /api/paystack/initialize
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      amount,
      currency = 'KES',
      reference,
      callbackUrl,
      metadata = {},
      customerName,
      phone,
    } = body

    // Validation
    if (!email || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Email and amount are required' },
        { status: 400 }
      )
    }

    // Convert to number if it's a string
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Initialize transaction
    const params: InitializeTransactionParams = {
      email: email.toLowerCase().trim(),
      amount: numericAmount, // Use the validated numeric amount
      currency,
      reference,
      callbackUrl,
      metadata,
      customerName,
      phone,
    }

    const result = await initializeTransaction(params)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to initialize transaction' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
      accessCode: result.accessCode,
    })
  } catch (error: any) {
    console.error('Error in Paystack initialize endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to initialize transaction' },
      { status: 500 }
    )
  }
}

