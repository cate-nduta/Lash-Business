import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

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
  prizeServiceType?: string
  createdAt: string
  expiresAt: string
  used: boolean
  usedAt?: string
  usedFor?: 'consultation' | 'checkout'
  orderId?: string
  consultationId?: string
}

interface SpinWheelCodesData {
  codes: SpinWheelCode[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, email, usedFor, orderId, consultationId } = body
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      )
    }
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }
    
    const normalizedCode = code.toUpperCase().trim()
    const normalizedEmail = email.toLowerCase().trim()
    
    // Load codes
    const codesData = await readDataFile<SpinWheelCodesData>('spin-wheel-codes.json', { codes: [] })
    const codeIndex = codesData.codes.findIndex(c => c.code === normalizedCode)
    
    if (codeIndex === -1) {
      return NextResponse.json(
        { error: 'Code not found' },
        { status: 404 }
      )
    }
    
    const codeRecord = codesData.codes[codeIndex]
    
    // Validate email
    if (codeRecord.email !== normalizedEmail) {
      return NextResponse.json(
        { error: 'Code email mismatch' },
        { status: 400 }
      )
    }
    
    // Check if already used
    if (codeRecord.used) {
      return NextResponse.json(
        { error: 'Code has already been used' },
        { status: 400 }
      )
    }
    
    // Check if expired
    const now = new Date()
    const expiresAt = new Date(codeRecord.expiresAt)
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Code has expired' },
        { status: 400 }
      )
    }
    
    // Mark as used
    codeRecord.used = true
    codeRecord.usedAt = now.toISOString()
    codeRecord.usedFor = usedFor || undefined
    codeRecord.orderId = orderId || undefined
    codeRecord.consultationId = consultationId || undefined
    
    await writeDataFile('spin-wheel-codes.json', codesData)
    
    return NextResponse.json({
      success: true,
      code: codeRecord.code,
      prize: {
        id: codeRecord.prizeId,
        label: codeRecord.prizeLabel,
        type: codeRecord.prizeType,
        value: codeRecord.prizeValue,
        serviceType: codeRecord.prizeServiceType,
      },
    })
  } catch (error: any) {
    console.error('Error marking code as used:', error)
    return NextResponse.json(
      { error: 'Failed to mark code as used', details: error.message },
      { status: 500 }
    )
  }
}


