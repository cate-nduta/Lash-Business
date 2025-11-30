import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

interface PreAppointmentGuidelines {
  version: number
  updatedAt: string
  introText: string
  fineAmount: number
  doItems: string[]
  dontItems: string[]
}

const DEFAULT_GUIDELINES: PreAppointmentGuidelines = {
  version: 1,
  updatedAt: '',
  introText: "Follow these guidelines to ensure the best results and a smooth, comfortable experience. Your lashes will thank you! 🤎",
  fineAmount: 500,
  doItems: [],
  dontItems: [],
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const guidelines = await readDataFile<PreAppointmentGuidelines>(
      'pre-appointment-guidelines.json',
      DEFAULT_GUIDELINES
    )
    return NextResponse.json(guidelines)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading pre-appointment guidelines:', error)
    return NextResponse.json({ error: 'Failed to load guidelines' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    
    const fineAmount = typeof body.fineAmount === 'number' ? Math.max(0, body.fineAmount) : 
                      typeof body.fineAmount === 'string' ? Math.max(0, Number(body.fineAmount) || DEFAULT_GUIDELINES.fineAmount) :
                      DEFAULT_GUIDELINES.fineAmount

    const guidelines: PreAppointmentGuidelines = {
      version: typeof body.version === 'number' ? body.version : 1,
      updatedAt: new Date().toISOString(),
      introText: typeof body.introText === 'string' ? body.introText : DEFAULT_GUIDELINES.introText,
      fineAmount: fineAmount,
      doItems: Array.isArray(body.doItems) ? body.doItems.filter((item: any) => typeof item === 'string' && item.trim().length > 0) : [],
      dontItems: Array.isArray(body.dontItems) ? body.dontItems.filter((item: any) => typeof item === 'string' && item.trim().length > 0) : [],
    }

    await writeDataFile('pre-appointment-guidelines.json', guidelines)
    return NextResponse.json({ success: true, guidelines })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving pre-appointment guidelines:', error)
    return NextResponse.json({ error: 'Failed to save guidelines' }, { status: 500 })
  }
}

