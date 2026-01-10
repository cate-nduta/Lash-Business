import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface DiscountCode {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  isFirstTimeOnly: boolean
  maxUses: number
  usedCount: number
  usedBy: string[]
  createdAt: string
  expiresAt?: string
  isActive: boolean
}

interface PromoCodesData {
  promoCodes: DiscountCode[]
}

interface Order {
  id: string
  email: string
  [key: string]: any
}

// Public GET endpoint - validate discount code and check if user is first-time
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const email = searchParams.get('email')
    const cartTotal = searchParams.get('cartTotal') // For calculating discount amount

    if (!code) {
      return NextResponse.json(
        { error: 'Discount code is required' },
        { status: 400 }
      )
    }

    // Load discount codes
    const promoCodesData = await readDataFile<PromoCodesData>('promo-codes.json', { promoCodes: [] })
    const discountCode = promoCodesData.promoCodes.find(
      (c) => c.code.toUpperCase() === code.toUpperCase().trim() && c.isActive
    )

    if (!discountCode) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Invalid discount code' 
        },
        { status: 200 } // Return 200 so frontend can handle it gracefully
      )
    }

    // Check if code has expired
    if (discountCode.expiresAt) {
      const expiresAt = new Date(discountCode.expiresAt)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { 
            valid: false,
            error: 'This discount code has expired' 
          },
          { status: 200 }
        )
      }
    }

    // Check if code has reached max uses (skip for first-time codes with unlimited uses)
    if (!discountCode.isFirstTimeOnly || discountCode.maxUses < 999999) {
      if (discountCode.usedCount >= discountCode.maxUses) {
        return NextResponse.json(
          { 
            valid: false,
            error: 'This discount code has already been used the maximum number of times' 
          },
          { status: 200 }
        )
      }
    }

    // If this is a first-time user only code, validate user eligibility
    if (discountCode.isFirstTimeOnly) {
      if (!email) {
        return NextResponse.json(
          { 
            valid: false,
            error: 'Email is required to validate first-time user discount code' 
          },
          { status: 200 }
        )
      }

      const normalizedEmail = email.toLowerCase().trim()

      // Check if user has already used this code
      if (discountCode.usedBy.includes(normalizedEmail)) {
        return NextResponse.json(
          { 
            valid: false,
            error: 'You have already used this discount code' 
          },
          { status: 200 }
        )
      }

      // Check if user has ever placed an order (they are not a first-time user)
      try {
        const ordersData = await readDataFile<{ orders: Order[] }>('labs-orders.json', { orders: [] })
        const hasPlacedOrder = ordersData.orders.some(
          (order) => order.email?.toLowerCase().trim() === normalizedEmail
        )

        if (hasPlacedOrder) {
          return NextResponse.json(
            { 
              valid: false,
              error: 'This discount code is only available for first-time users' 
            },
            { status: 200 }
          )
        }
      } catch (error) {
        console.error('Error checking order history:', error)
        // Continue validation if order check fails
      }
    } else {
      // For non-first-time codes, check if user has already used it
      if (email) {
        const normalizedEmail = email.toLowerCase().trim()
        if (discountCode.usedBy.includes(normalizedEmail)) {
          return NextResponse.json(
            { 
              valid: false,
              error: 'You have already used this discount code' 
            },
            { status: 200 }
          )
        }
      }
    }

    // Calculate discount amount
    let discountAmount = 0
    if (cartTotal) {
      const total = parseFloat(cartTotal)
      if (discountCode.discountType === 'percentage') {
        discountAmount = Math.round(total * (discountCode.discountValue / 100))
      } else {
        discountAmount = Math.min(discountCode.discountValue, total) // Fixed amount, but can't exceed cart total
      }
    }

    return NextResponse.json({
      valid: true,
      code: discountCode.code,
      discountType: discountCode.discountType,
      discountValue: discountCode.discountValue,
      discountAmount: discountAmount,
      isFirstTimeOnly: discountCode.isFirstTimeOnly,
      maxUses: discountCode.maxUses,
      remainingUses: (discountCode.isFirstTimeOnly && discountCode.maxUses >= 999999) 
        ? 999999 
        : (discountCode.maxUses - discountCode.usedCount),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error validating discount code:', error)
    return NextResponse.json(
      { 
        valid: false,
        error: 'Failed to validate discount code',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Public POST endpoint - mark discount code as used (called after successful checkout)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, email } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Discount code is required' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedCode = code.toUpperCase().trim()

    // Load discount codes
    const data = await readDataFile<PromoCodesData>('promo-codes.json', { promoCodes: [] })
    const discountCode = data.promoCodes.find((c) => c.code.toUpperCase() === normalizedCode)

    if (!discountCode) {
      return NextResponse.json(
        { error: 'Discount code not found' },
        { status: 404 }
      )
    }

    // Check if code has reached max uses (skip for first-time codes with unlimited uses)
    if (!discountCode.isFirstTimeOnly || discountCode.maxUses < 999999) {
      if (discountCode.usedCount >= discountCode.maxUses) {
        return NextResponse.json(
          { error: 'This discount code has already been used the maximum number of times' },
          { status: 400 }
        )
      }
    }

    // Check if this user has already used this code
    if (discountCode.usedBy.includes(normalizedEmail)) {
      return NextResponse.json(
        { error: 'You have already used this discount code' },
        { status: 400 }
      )
    }

    // Mark code as used
    discountCode.usedCount += 1
    discountCode.usedBy.push(normalizedEmail)

    // Save updated data
    await writeDataFile('promo-codes.json', data)

    return NextResponse.json({
      success: true,
      code: discountCode.code,
      usedCount: discountCode.usedCount,
      remainingUses: (discountCode.isFirstTimeOnly && discountCode.maxUses >= 999999)
        ? 999999
        : (discountCode.maxUses - discountCode.usedCount),
    })
  } catch (error: any) {
    console.error('Error marking discount code as used:', error)
    return NextResponse.json(
      { error: 'Failed to mark discount code as used', details: error.message },
      { status: 500 }
    )
  }
}

