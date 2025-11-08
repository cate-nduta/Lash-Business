import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function POST(request: NextRequest) {
  try {
    const promoData = await readDataFile<{ promoCodes: any[] }>('promo-codes.json', { promoCodes: [] })
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Promo code required' }, { status: 400 })
    }

    const promoCode = (promoData.promoCodes || []).find((promo) => promo.code.toLowerCase() === code.toLowerCase())

    if (!promoCode) {
      return NextResponse.json({ valid: false, error: 'Invalid promo code' }, { status: 404 })
    }

    return NextResponse.json({ valid: true, promoCode })
  } catch (error) {
    console.error('Error validating promo code:', error)
    return NextResponse.json({ valid: false, error: 'Failed to validate promo code' }, { status: 500 })
  }
}

