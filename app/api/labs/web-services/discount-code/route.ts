import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface DiscountCode {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number // Percentage (0-100) or fixed amount in KES
  isFirstTimeOnly: boolean // Only first-time users can use this code
  maxUses: number // Maximum number of times this code can be used (1 = single use)
  usedCount: number // Track how many times this code has been used
  usedBy: string[] // Array of email addresses that have used this code
  createdAt: string
  expiresAt?: string // ISO date string - optional expiration date
  isActive: boolean // Enable/disable code
}

interface PromoCodesData {
  promoCodes: DiscountCode[]
}

const DEFAULT_DATA: PromoCodesData = {
  promoCodes: [],
}

// Generate a random discount code
function generateDiscountCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing characters
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Admin GET endpoint - list all discount codes
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const data = await readDataFile<PromoCodesData>('promo-codes.json', DEFAULT_DATA)
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching discount codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discount codes', details: error.message },
      { status: 500 }
    )
  }
}

// Admin POST endpoint - create new discount code or generate first-time user code
export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const body = await request.json()
    const { action, code, discountType, discountValue, maxUses, expiresAt, isActive } = body

    // Generate first-time user discount code
    if (action === 'generate-first-time') {
      const data = await readDataFile<PromoCodesData>('promo-codes.json', DEFAULT_DATA)
      
      // Check if a first-time user code already exists
      const existingFirstTimeCode = data.promoCodes.find(
        (c) => c.isFirstTimeOnly && c.isActive
      )
      
      if (existingFirstTimeCode) {
        return NextResponse.json(
          { 
            error: 'A first-time user discount code already exists',
            existingCode: {
              code: existingFirstTimeCode.code,
              id: existingFirstTimeCode.id,
            }
          },
          { status: 400 }
        )
      }

      // Generate new code
      let newCode: string
      let attempts = 0
      do {
        newCode = generateDiscountCode(8)
        attempts++
        if (attempts > 10) {
          newCode = `FIRST${Date.now().toString(36).toUpperCase().slice(-6)}`
          break
        }
      } while (data.promoCodes.some((c) => c.code === newCode))

      const discountCode: DiscountCode = {
        id: crypto.randomUUID(),
        code: newCode,
        discountType: discountType || 'percentage',
        discountValue: typeof discountValue === 'number' ? discountValue : 10, // Default 10%
        isFirstTimeOnly: true, // This is a first-time user only code
        maxUses: 999999, // Unlimited uses - can be used by any first-time user (each user can only use once)
        usedCount: 0,
        usedBy: [],
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt || undefined,
        isActive: isActive !== false, // Active by default
      }

      data.promoCodes.push(discountCode)
      await writeDataFile('promo-codes.json', data)

      return NextResponse.json({
        success: true,
        code: discountCode,
      })
    }

    // Create custom discount code
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { error: 'Discount code is required' },
        { status: 400 }
      )
    }

    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
      return NextResponse.json(
        { error: 'discountType must be "percentage" or "fixed"' },
        { status: 400 }
      )
    }

    if (typeof discountValue !== 'number' || discountValue <= 0) {
      return NextResponse.json(
        { error: 'discountValue must be a positive number' },
        { status: 400 }
      )
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return NextResponse.json(
        { error: 'Percentage discount cannot exceed 100%' },
        { status: 400 }
      )
    }

    const data = await readDataFile<PromoCodesData>('promo-codes.json', DEFAULT_DATA)
    
    // Check if code already exists
    const existingCode = data.promoCodes.find((c) => c.code.toUpperCase() === code.toUpperCase().trim())
    if (existingCode) {
      return NextResponse.json(
        { error: 'Discount code already exists' },
        { status: 400 }
      )
    }

    const discountCode: DiscountCode = {
      id: crypto.randomUUID(),
      code: code.toUpperCase().trim(),
      discountType,
      discountValue,
      isFirstTimeOnly: false,
      maxUses: typeof maxUses === 'number' && maxUses > 0 ? maxUses : 1,
      usedCount: 0,
      usedBy: [],
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || undefined,
      isActive: isActive !== false,
    }

    data.promoCodes.push(discountCode)
    await writeDataFile('promo-codes.json', data)

    return NextResponse.json({
      success: true,
      code: discountCode,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error creating discount code:', error)
    return NextResponse.json(
      { error: 'Failed to create discount code', details: error.message },
      { status: 500 }
    )
  }
}

// Admin PUT endpoint - update discount code
export async function PUT(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const body = await request.json()
    const { id, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Discount code ID is required' },
        { status: 400 }
      )
    }

    const data = await readDataFile<PromoCodesData>('promo-codes.json', DEFAULT_DATA)
    const codeIndex = data.promoCodes.findIndex((c) => c.id === id)

    if (codeIndex === -1) {
      return NextResponse.json(
        { error: 'Discount code not found' },
        { status: 404 }
      )
    }

    // Update active status
    if (typeof isActive === 'boolean') {
      data.promoCodes[codeIndex].isActive = isActive
    }

    await writeDataFile('promo-codes.json', data)

    return NextResponse.json({
      success: true,
      code: data.promoCodes[codeIndex],
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error updating discount code:', error)
    return NextResponse.json(
      { error: 'Failed to update discount code', details: error.message },
      { status: 500 }
    )
  }
}

// Admin DELETE endpoint - delete discount code
export async function DELETE(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Discount code ID is required' },
        { status: 400 }
      )
    }

    const data = await readDataFile<PromoCodesData>('promo-codes.json', DEFAULT_DATA)
    const initialLength = data.promoCodes.length
    data.promoCodes = data.promoCodes.filter((c) => c.id !== id)

    if (data.promoCodes.length === initialLength) {
      return NextResponse.json(
        { error: 'Discount code not found' },
        { status: 404 }
      )
    }

    await writeDataFile('promo-codes.json', data)

    return NextResponse.json({
      success: true,
      message: 'Discount code deleted successfully',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error deleting discount code:', error)
    return NextResponse.json(
      { error: 'Failed to delete discount code', details: error.message },
      { status: 500 }
    )
  }
}

