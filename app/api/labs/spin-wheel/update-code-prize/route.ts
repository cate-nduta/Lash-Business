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
  freeServiceId?: string
  discountServiceId?: string
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
    const { code, prizeId, prizeLabel, prizeType, prizeValue, prizeServiceType, freeServiceId, discountServiceId } = body

    if (!code || !prizeId) {
      return NextResponse.json(
        { error: 'Code and prize ID are required' },
        { status: 400 }
      )
    }

    const codesData = await readDataFile<SpinWheelCodesData>('spin-wheel-codes.json', { codes: [] })
    const codeIndex = codesData.codes.findIndex(c => c.code === code.toUpperCase())

    if (codeIndex === -1) {
      return NextResponse.json(
        { error: 'Code not found' },
        { status: 404 }
      )
    }

    // Update the code record with the actual prize won
    codesData.codes[codeIndex] = {
      ...codesData.codes[codeIndex],
      prizeId,
      prizeLabel: prizeLabel || codesData.codes[codeIndex].prizeLabel,
      prizeType: prizeType || codesData.codes[codeIndex].prizeType,
      prizeValue: prizeValue !== undefined ? prizeValue : codesData.codes[codeIndex].prizeValue,
      prizeServiceType: prizeServiceType !== undefined ? prizeServiceType : codesData.codes[codeIndex].prizeServiceType,
      freeServiceId: freeServiceId !== undefined ? freeServiceId : codesData.codes[codeIndex].freeServiceId,
      discountServiceId: discountServiceId !== undefined ? discountServiceId : codesData.codes[codeIndex].discountServiceId,
    }

    await writeDataFile('spin-wheel-codes.json', codesData)

    return NextResponse.json({
      success: true,
      code: codesData.codes[codeIndex],
    })
  } catch (error: any) {
    console.error('Error updating code prize:', error)
    return NextResponse.json(
      { error: 'Failed to update code prize', details: error.message },
      { status: 500 }
    )
  }
}

