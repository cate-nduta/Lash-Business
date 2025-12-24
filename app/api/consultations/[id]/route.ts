import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { Consultation } from '@/types/consultation-workflow'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET: Get a specific consultation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const consultations = await readDataFile<Consultation[]>('consultations.json', [])
    const consultation = consultations.find(c => c.id === params.id)
    
    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ consultation })
  } catch (error) {
    console.error('Error fetching consultation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consultation' },
      { status: 500 }
    )
  }
}

// PATCH: Update a consultation (for admin decisions)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const consultations = await readDataFile<Consultation[]>('consultations.json', [])
    const index = consultations.findIndex(c => c.id === params.id)
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }

    const consultation = consultations[index]
    
    // Update consultation
    const updated: Consultation = {
      ...consultation,
      ...body,
      updatedAt: new Date().toISOString(),
    }

    // If admin decision is made, update status
    if (body.adminDecision === 'proceed') {
      updated.status = 'completed'
      updated.adminDecisionAt = new Date().toISOString()
    } else if (body.adminDecision === 'decline') {
      updated.status = 'declined'
      updated.adminDecisionAt = new Date().toISOString()
    }

    consultations[index] = updated
    await writeDataFile('consultations.json', consultations)

    return NextResponse.json({ 
      success: true,
      consultation: updated 
    })
  } catch (error) {
    console.error('Error updating consultation:', error)
    return NextResponse.json(
      { error: 'Failed to update consultation' },
      { status: 500 }
    )
  }
}

