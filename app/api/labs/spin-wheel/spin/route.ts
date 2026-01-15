import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SpinWheelPrize {
  id: string
  label: string
  type: 'free_consultation' | 'discount_percentage' | 'free_service'
  value?: number
  serviceType?: string // Legacy field
  freeServiceId?: string // The product/service ID that will be free
  discountServiceId?: string // The product/service ID that will be discounted (for discount_percentage type)
  probability: number
  enabled: boolean
  order: number
}

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
  expiresAt: string // 1 month from creation
  used: boolean
  usedAt?: string
  usedFor?: 'consultation' | 'checkout'
  orderId?: string
  consultationId?: string
}

interface SpinWheelCodesData {
  codes: SpinWheelCode[]
}

// Generate a random code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'SPIN'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Select prize based on probability
function selectPrize(prizes: SpinWheelPrize[]): SpinWheelPrize | null {
  const enabledPrizes = prizes.filter(p => p.enabled)
  if (enabledPrizes.length === 0) return null
  
  // Calculate total probability
  const totalProbability = enabledPrizes.reduce((sum, prize) => sum + prize.probability, 0)
  if (totalProbability === 0) return null
  
  // Generate random number between 0 and totalProbability
  const random = Math.random() * totalProbability
  
  // Find the prize based on cumulative probability
  let cumulative = 0
  for (const prize of enabledPrizes) {
    cumulative += prize.probability
    if (random <= cumulative) {
      return prize
    }
  }
  
  // Fallback to last prize
  return enabledPrizes[enabledPrizes.length - 1]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }
    
    const normalizedEmail = email.toLowerCase().trim()
    
    // Load settings to get prizes
    const settings = await readDataFile<{ enabled: boolean; prizes: SpinWheelPrize[] }>(
      'spin-wheel-settings.json',
      { enabled: true, prizes: [] }
    )
    
    if (!settings.enabled) {
      return NextResponse.json(
        { error: 'Spin the wheel is currently disabled' },
        { status: 400 }
      )
    }
    
    // Check if user has already spun before (one spin per email ever)
    const codesData = await readDataFile<SpinWheelCodesData>('spin-wheel-codes.json', { codes: [] })
    const hasSpunBefore = codesData.codes.some(
      code => code.email === normalizedEmail
    )
    
    if (hasSpunBefore) {
      return NextResponse.json(
        { error: 'You have already spun the wheel and won a prize. Each email can only spin once.' },
        { status: 400 }
      )
    }
    
    // Select prize
    const selectedPrize = selectPrize(settings.prizes)
    if (!selectedPrize) {
      return NextResponse.json(
        { error: 'No prizes available' },
        { status: 500 }
      )
    }
    
    // Generate unique code
    let code: string
    let attempts = 0
    do {
      code = generateCode()
      attempts++
      if (attempts > 10) {
        code = `SPIN${Date.now().toString(36).toUpperCase().slice(-6)}`
        break
      }
    } while (codesData.codes.some(c => c.code === code))
    
    // Create expiration date (1 month from now)
    const createdAt = new Date()
    const expiresAt = new Date(createdAt)
    expiresAt.setMonth(expiresAt.getMonth() + 1)
    
    // Create code record
    const codeRecord: SpinWheelCode = {
      id: crypto.randomUUID(),
      code,
      email: normalizedEmail,
      prizeId: selectedPrize.id,
      prizeLabel: selectedPrize.label,
      prizeType: selectedPrize.type,
      prizeValue: selectedPrize.value,
      prizeServiceType: selectedPrize.serviceType, // Legacy field
      freeServiceId: selectedPrize.freeServiceId, // The product/service ID that will be free
      discountServiceId: selectedPrize.discountServiceId, // The product/service ID that will be discounted
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false,
    }
    
    codesData.codes.push(codeRecord)
    await writeDataFile('spin-wheel-codes.json', codesData)
    
    return NextResponse.json({
      success: true,
      prize: {
        id: selectedPrize.id,
        label: selectedPrize.label,
        type: selectedPrize.type,
        value: selectedPrize.value,
        serviceType: selectedPrize.serviceType, // Legacy field
        freeServiceId: selectedPrize.freeServiceId, // The product/service ID that will be free
        discountServiceId: selectedPrize.discountServiceId, // The product/service ID that will be discounted
      },
      code,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error: any) {
    console.error('Error processing spin:', error)
    return NextResponse.json(
      { error: 'Failed to process spin', details: error.message },
      { status: 500 }
    )
  }
}

