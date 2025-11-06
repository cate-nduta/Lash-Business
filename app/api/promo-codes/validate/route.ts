import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ valid: false, error: 'Promo code is required' })
    }

    const promoData = readDataFile<{ promoCodes: any[] }>('promo-codes.json')
    const promoCodes = promoData.promoCodes || (Array.isArray(promoData) ? promoData : [])
    // First, find the promo code (check both active and inactive)
    const promoCode = promoCodes.find(
      (pc) => pc.code.toUpperCase() === code.toUpperCase()
    )

    if (!promoCode) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid promo code',
        errorType: 'not_found'
      })
    }

    // Check if promo code is active
    if (!promoCode.active) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This promo code is no longer active',
        errorType: 'inactive'
      })
    }

    // Check validity dates
    const now = new Date()
    const validFrom = new Date(promoCode.validFrom)
    const validUntil = new Date(promoCode.validUntil)
    
    // Set time to end of day for validUntil to allow use on the last day
    validUntil.setHours(23, 59, 59, 999)

    if (now < validFrom) {
      const fromDate = validFrom.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
      return NextResponse.json({ 
        valid: false, 
        error: `This promo code is not yet valid. It becomes active on ${fromDate}`,
        errorType: 'not_started'
      })
    }

    if (now > validUntil) {
      const untilDate = validUntil.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
      return NextResponse.json({ 
        valid: false, 
        error: `This promo code has expired. It was valid until ${untilDate}`,
        errorType: 'expired'
      })
    }

    // Check usage limit
    if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This promo code has reached its usage limit and is no longer available',
        errorType: 'usage_limit_reached'
      })
    }

    return NextResponse.json({
      valid: true,
      promoCode: {
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        maxDiscount: promoCode.maxDiscount,
        description: promoCode.description,
      },
    })
  } catch (error) {
    return NextResponse.json({ valid: false, error: 'Error validating promo code' }, { status: 500 })
  }
}

