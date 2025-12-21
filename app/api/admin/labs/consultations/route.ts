import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ConsultationSubmission } from '@/app/api/labs/consultation/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const consultationsData = await readDataFile<{ consultations: ConsultationSubmission[] }>(
      'labs-consultations.json',
      { consultations: [] }
    )

    // Sort by most recent first
    const sortedConsultations = [...consultationsData.consultations].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )

    return NextResponse.json({
      consultations: sortedConsultations,
      total: sortedConsultations.length,
    })
  } catch (error) {
    console.error('Error loading consultations:', error)
    return NextResponse.json(
      { error: 'Failed to load consultations', consultations: [], total: 0 },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Delete all consultations
    await writeDataFile('labs-consultations.json', { consultations: [] })
    
    // Also delete all invoices to reset invoice numbering
    const { writeDataFile: writeInvoices } = await import('@/lib/data-utils')
    await writeInvoices('labs-invoices.json', [])

    return NextResponse.json({
      success: true,
      message: 'All consultations and invoices deleted successfully. Invoice numbering will reset.',
      deletedCount: 0, // We don't track the count before deletion, but it's cleared
    })
  } catch (error) {
    console.error('Error deleting consultations:', error)
    return NextResponse.json(
      { error: 'Failed to delete consultations' },
      { status: 500 }
    )
  }
}

