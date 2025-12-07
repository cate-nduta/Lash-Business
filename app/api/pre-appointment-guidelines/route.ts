import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

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
    const guidelines = await readDataFile<PreAppointmentGuidelines>(
      'pre-appointment-guidelines.json',
      DEFAULT_GUIDELINES
    )
    return NextResponse.json(guidelines, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error loading pre-appointment guidelines:', error)
    return NextResponse.json(DEFAULT_GUIDELINES, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

