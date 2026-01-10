import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

interface ReferralCode {
  code: string
  referrerEmail: string
  referrerOrderId: string
  createdAt: string
  usedBy: string[] // Array of emails who used this code
  isActive: boolean
}

interface ReferralCodesData {
  codes: ReferralCode[]
}

const DEFAULT_DATA: ReferralCodesData = {
  codes: [],
}

// Generate a unique referral code
function generateReferralCode(): string {
  const prefix = 'LABS'
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `${prefix}-${randomPart}`
}

// GET: Check if a referral code is valid
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
    }

    const data = await readDataFile<ReferralCodesData>('labs-referral-codes.json', DEFAULT_DATA)
    const referralCode = data.codes.find((c) => c.code === code.toUpperCase() && c.isActive)

    if (!referralCode) {
      return NextResponse.json({ valid: false, error: 'Invalid or inactive referral code' })
    }

    // Check if code has already been used (can only be used once)
    if (referralCode.usedBy.length > 0) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This referral code has already been used' 
      })
    }

    return NextResponse.json({
      valid: true,
      code: referralCode.code,
      referrerEmail: referralCode.referrerEmail,
    })
  } catch (error: any) {
    console.error('Error checking referral code:', error)
    return NextResponse.json({ error: 'Failed to check referral code' }, { status: 500 })
  }
}

// POST: Create a new referral code or apply it
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, orderId, email, code, userEmail } = body

    if (action === 'create') {
      // Create a new referral code for a completed order
      if (!orderId || !email) {
        return NextResponse.json({ error: 'Order ID and email are required' }, { status: 400 })
      }

      const data = await readDataFile<ReferralCodesData>('labs-referral-codes.json', DEFAULT_DATA)

      // Check if user already has a referral code
      const existingCode = data.codes.find(
        (c) => c.referrerEmail === email && c.referrerOrderId === orderId && c.isActive
      )

      if (existingCode) {
        return NextResponse.json({
          success: true,
          code: existingCode.code,
          message: 'Referral code already exists',
        })
      }

      // Generate new referral code
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

      return NextResponse.json({
        success: true,
        code: newCode,
        message: 'Referral code created successfully',
      })
    } else if (action === 'apply') {
      // Apply a referral code (validate and mark as used - can only be used once)
      if (!code || !userEmail) {
        return NextResponse.json({ error: 'Code and user email are required' }, { status: 400 })
      }

      const data = await readDataFile<ReferralCodesData>('labs-referral-codes.json', DEFAULT_DATA)
      const referralCode = data.codes.find((c) => c.code === code.toUpperCase() && c.isActive)

      if (!referralCode) {
        return NextResponse.json({ error: 'Invalid or inactive referral code' }, { status: 400 })
      }

      // Check if code has already been used (can only be used once total)
      if (referralCode.usedBy.length > 0) {
        return NextResponse.json({ 
          error: 'This referral code has already been used and cannot be used again' 
        }, { status: 400 })
      }

      // Check if user is trying to use their own code
      if (referralCode.referrerEmail.toLowerCase() === userEmail.toLowerCase()) {
        return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 })
      }

      // Mark code as used (only once, so we just add the first user)
      referralCode.usedBy.push(userEmail)
      referralCode.isActive = false // Deactivate the code after first use
      await writeDataFile('labs-referral-codes.json', data)

      return NextResponse.json({
        success: true,
        code: referralCode.code,
        referrerEmail: referralCode.referrerEmail,
        message: 'Referral code applied successfully',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error processing referral:', error)
    return NextResponse.json({ error: 'Failed to process referral' }, { status: 500 })
  }
}

