import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendReferralCodeEmail } from '../../web-services/email-utils'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

interface ReferralCode {
  code: string
  referrerEmail: string
  referrerOrderId: string
  createdAt: string
  usedBy: string[]
  isActive: boolean
}

interface ReferralCodesData {
  codes: ReferralCode[]
}

// Generate a unique referral code
function generateReferralCode(): string {
  const prefix = 'LABS'
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `${prefix}-${randomPart}`
}

// Generate referral code for a completed order
export async function POST(request: NextRequest) {
  try {
    // Check authentication (admin only or system)
    const authHeader = request.headers.get('authorization')
    const isSystemCall = authHeader === `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`

    if (!isSystemCall) {
      // Try admin auth
      try {
        const authResponse = await fetch(new URL('/api/admin/current-user', request.url), {
          headers: {
            Cookie: request.headers.get('Cookie') || '',
          },
        })
        if (!authResponse.ok || !(await authResponse.json()).authenticated) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { orderId, email, orderTotal, businessName, referralDiscountPercentage, referrerRewardPercentage } = body

    if (!orderId || !email) {
      return NextResponse.json({ error: 'Order ID and email are required' }, { status: 400 })
    }

    // Load referral settings if not provided
    let discountPercentage = referralDiscountPercentage
    let rewardPercentage = referrerRewardPercentage
    
    if (discountPercentage === undefined || rewardPercentage === undefined) {
      const webServicesData = await readDataFile<any>('labs-web-services.json', {})
      discountPercentage = discountPercentage ?? webServicesData.referralDiscountPercentage ?? 10
      rewardPercentage = rewardPercentage ?? webServicesData.referrerRewardPercentage ?? 5
    }

    const data = await readDataFile<ReferralCodesData>('labs-referral-codes.json', { codes: [] })

    // Check if referral code already exists for this order
    const existingCode = data.codes.find(
      (c) => c.referrerOrderId === orderId
    )

    if (existingCode) {
      // Resend email with existing code
      await sendReferralCodeEmail({
        email,
        referralCode: existingCode.code,
        businessName: businessName || 'Valued Customer',
        orderTotal: orderTotal || 0,
        referralDiscountPercentage: discountPercentage,
        referrerRewardPercentage: rewardPercentage,
      })
      return NextResponse.json({
        success: true,
        code: existingCode.code,
        message: 'Referral code already exists, email sent',
      })
    }

    // Generate new code
    let newCode: string
    let attempts = 0
    do {
      newCode = generateReferralCode()
      attempts++
      if (attempts > 10) {
        throw new Error('Failed to generate unique referral code')
      }
    } while (data.codes.some((c) => c.code === newCode))

    const referralCode: ReferralCode = {
      code: newCode,
      referrerEmail: email,
      referrerOrderId: orderId,
      createdAt: new Date().toISOString(),
      usedBy: [],
      isActive: true,
    }

    data.codes.push(referralCode)
    await writeDataFile('labs-referral-codes.json', data)

    // Send referral email
    await sendReferralCodeEmail({
      email,
      referralCode: newCode,
      businessName: businessName || 'Valued Customer',
      orderTotal: orderTotal || 0,
      referralDiscountPercentage: discountPercentage,
      referrerRewardPercentage: rewardPercentage,
    })

    return NextResponse.json({
      success: true,
      code: newCode,
      message: 'Referral code generated and email sent',
    })
  } catch (error: any) {
    console.error('Error generating referral code:', error)
    return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 })
  }
}

