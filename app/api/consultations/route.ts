import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { Consultation } from '@/types/consultation-workflow'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET: List all consultations
export async function GET(request: NextRequest) {
  try {
    const consultations = await readDataFile<Consultation[]>('consultations.json', [])
    
    // Sort by most recent first
    const sorted = consultations.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return NextResponse.json({ consultations: sorted })
  } catch (error) {
    console.error('Error fetching consultations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consultations' },
      { status: 500 }
    )
  }
}

// POST: Create a new consultation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientName,
      clientEmail,
      clientPhone,
      consultationDate,
      consultationType,
      notes,
    } = body

    if (!clientName || !clientEmail || !consultationDate) {
      return NextResponse.json(
        { error: 'Missing required fields: clientName, clientEmail, consultationDate' },
        { status: 400 }
      )
    }

    const consultations = await readDataFile<Consultation[]>('consultations.json', [])
    
    const consultation: Consultation = {
      id: `consult-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      clientName,
      clientEmail,
      clientPhone,
      consultationDate,
      consultationType,
      notes,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    consultations.push(consultation)
    await writeDataFile('consultations.json', consultations)

    return NextResponse.json({ 
      success: true,
      consultation 
    })
  } catch (error) {
    console.error('Error creating consultation:', error)
    return NextResponse.json(
      { error: 'Failed to create consultation' },
      { status: 500 }
    )
  }
}

