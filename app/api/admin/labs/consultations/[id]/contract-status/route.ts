import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { Contract } from '@/types/consultation-workflow'
import type { ConsultationSubmission } from '@/app/api/labs/consultation/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET: Get contract status for a consultation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get consultation
    const consultationsData = await readDataFile<{ consultations: ConsultationSubmission[] }>(
      'labs-consultations.json',
      { consultations: [] }
    )
    
    const consultation = consultationsData.consultations.find(
      c => (c.consultationId || c.submittedAt) === params.id
    )
    
    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }

    // If no contract ID, no contract exists
    if (!consultation.contractId) {
      return NextResponse.json({
        hasContract: false,
        contractStatus: null,
        contract: null,
      })
    }

    // Get contract
    const contracts = await readDataFile<Contract[]>('contracts.json', [])
    const contractIndex = contracts.findIndex(c => c.id === consultation.contractId)
    
    if (contractIndex === -1) {
      return NextResponse.json({
        hasContract: false,
        contractStatus: null,
        contract: null,
      })
    }

    const contract = contracts[contractIndex]
    
    // Check if contract has expired (7 days from creation) if still pending
    let contractStatus = contract.status
    if (contract.status === 'pending') {
      const createdAt = new Date(contract.createdAt)
      const now = new Date()
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceCreation >= 7) {
        contractStatus = 'expired'
        // Update contract status
        const { writeDataFile } = await import('@/lib/data-utils')
        contracts[contractIndex] = {
          ...contract,
          status: 'expired',
          updatedAt: new Date().toISOString(),
        }
        await writeDataFile('contracts.json', contracts)
      }
    }

    return NextResponse.json({
      hasContract: true,
      contractStatus,
      contract: {
        id: contract.id,
        status: contractStatus,
        signedAt: contract.signedAt,
        signedByName: contract.signedByName,
        contractDate: contract.contractDate,
        projectCost: contract.projectCost,
        createdAt: contract.createdAt,
        daysRemaining: contractStatus === 'pending' ? Math.max(0, 7 - Math.floor((new Date().getTime() - new Date(contract.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : null,
      },
    })
  } catch (error) {
    console.error('Error fetching contract status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract status' },
      { status: 500 }
    )
  }
}

