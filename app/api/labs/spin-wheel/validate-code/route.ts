import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SpinWheelCode {
  id: string
  code: string
  email: string
  prizeId: string
  prizeLabel: string
  prizeType: string
  prizeValue?: number
  prizeServiceType?: string // Legacy field
  freeServiceId?: string // The product/service ID that will be free
  discountServiceId?: string // The product/service ID that will be discounted (for discount_percentage type)
  createdAt: string
  expiresAt: string
  used: boolean
  usedAt?: string
  usedFor?: 'consultation' | 'checkout'
}

interface SpinWheelCodesData {
  codes: SpinWheelCode[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const email = searchParams.get('email')
    const context = searchParams.get('context') // 'consultation' or 'checkout'
    
    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Code is required' },
        { status: 200 }
      )
    }
    
    const normalizedCode = code.toUpperCase().trim()
    
    // Load codes
    const codesData = await readDataFile<SpinWheelCodesData>('spin-wheel-codes.json', { codes: [] })
    const codeRecord = codesData.codes.find(c => c.code === normalizedCode)
    
    if (!codeRecord) {
      return NextResponse.json(
        { valid: false, error: 'Invalid code' },
        { status: 200 }
      )
    }
    
    // Check if code has expired
    const now = new Date()
    const expiresAt = new Date(codeRecord.expiresAt)
    if (now > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'This code has expired' },
        { status: 200 }
      )
    }
    
    // Check if code has been used
    if (codeRecord.used) {
      return NextResponse.json(
        { valid: false, error: 'This code has already been used' },
        { status: 200 }
      )
    }
    
    // Validate context if provided
    if (context) {
      if (context === 'consultation' && codeRecord.prizeType !== 'free_consultation') {
        return NextResponse.json(
          { valid: false, error: 'This code cannot be used for consultations' },
          { status: 200 }
        )
      }
      if (context === 'checkout' && codeRecord.prizeType === 'free_consultation') {
        return NextResponse.json(
          { valid: false, error: 'This code can only be used for consultations' },
          { status: 200 }
        )
      }
    }
    
    // Check email match - if email is provided and doesn't match, return error with the correct email
    if (email) {
      const normalizedEmail = email.toLowerCase().trim()
      if (codeRecord.email !== normalizedEmail) {
        return NextResponse.json(
          { 
            valid: false, 
            error: 'This code was issued to a different email address',
            codeEmail: codeRecord.email, // Return the email the code was issued to
          },
          { status: 200 }
        )
      }
    }
    
    return NextResponse.json({
      valid: true,
      code: codeRecord.code,
      codeEmail: codeRecord.email, // Always return the email the code was issued to
      prize: {
        id: codeRecord.prizeId,
        label: codeRecord.prizeLabel,
        type: codeRecord.prizeType,
        value: codeRecord.prizeValue,
        serviceType: codeRecord.prizeServiceType, // Legacy field
        freeServiceId: codeRecord.freeServiceId, // The product/service ID that will be free
        discountServiceId: codeRecord.discountServiceId, // The product/service ID that will be discounted
      },
      expiresAt: codeRecord.expiresAt,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error validating code:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate code', details: error.message },
      { status: 500 }
    )
  }
}

