import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

interface YearlySubscriber {
  id: string
  name: string
  email: string
  phoneNumber?: string
  totalAnnualAmount: number
  yearlyItems: Array<{
    productId: string
    productName: string
    quantity: number
    annualPrice: number
  }>
  orderIds: string[]
  createdAt: string
  lastRenewalDate?: string
  nextRenewalDate?: string
  paymentStatus: 'active' | 'pending' | 'overdue'
}

// Generate Paystack payment link for annual subscription
export async function POST(request: NextRequest) {
  try {
    const { subscriberId } = await request.json()
    
    if (!subscriberId) {
      return NextResponse.json({ error: 'Subscriber ID is required' }, { status: 400 })
    }
    
    const subscribers = await readDataFile<YearlySubscriber[]>('labs-yearly-subscribers.json', [])
    const subscriber = subscribers.find((s) => s.id === subscriberId)
    
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }
    
    // Generate a unique reference for this payment
    const reference = `yearly-renewal-${subscriberId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    
    // Amount in kobo (Paystack uses kobo for NGN, but for KES we use the amount directly)
    // Paystack KES amounts are in the smallest currency unit (cents), but KES doesn't have cents
    // So we multiply by 100 to convert to the smallest unit
    const amountInKobo = Math.round(subscriber.totalAnnualAmount * 100)
    
    // Create payment link to subscription payment page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const paymentLink = `${baseUrl}/labs/subscription-payment?subscriberId=${subscriberId}&reference=${reference}&amount=${subscriber.totalAnnualAmount}`
    
    return NextResponse.json({
      success: true,
      paymentLink,
      reference,
      amount: subscriber.totalAnnualAmount,
      subscriber: {
        id: subscriber.id,
        name: subscriber.name,
        email: subscriber.email,
        totalAnnualAmount: subscriber.totalAnnualAmount,
      },
    })
  } catch (error: any) {
    console.error('Error generating payment link:', error)
    return NextResponse.json(
      { error: 'Failed to generate payment link', details: error.message },
      { status: 500 }
    )
  }
}

