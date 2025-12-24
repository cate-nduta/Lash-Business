import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { Invoice } from '@/types/consultation-workflow'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET: List all invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contractId = searchParams.get('contractId')
    const consultationId = searchParams.get('consultationId')
    const status = searchParams.get('status')

    let invoices = await readDataFile<Invoice[]>('invoices.json', [])

    // Filter by contractId if provided
    if (contractId) {
      invoices = invoices.filter(i => i.contractId === contractId)
    }

    // Filter by consultationId if provided
    if (consultationId) {
      invoices = invoices.filter(i => i.consultationId === consultationId)
    }

    // Filter by status if provided
    if (status) {
      invoices = invoices.filter(i => i.status === status)
    }

    // Sort by most recent first
    const sorted = invoices.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ invoices: sorted })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

