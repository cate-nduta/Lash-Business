import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { Contract } from '@/types/consultation-workflow'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET: Get contract by token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { readDataFile, writeDataFile } = await import('@/lib/data-utils')
    const contracts = await readDataFile<Contract[]>('contracts.json', [])
    const contractIndex = contracts.findIndex(c => c.contractToken === params.token)
    
    if (contractIndex === -1) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    const contract = contracts[contractIndex]

    // Check if contract has expired (7 days from creation)
    if (contract.status === 'pending') {
      const createdAt = new Date(contract.createdAt)
      const now = new Date()
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceCreation >= 7) {
        // Mark contract as expired
        contracts[contractIndex] = {
          ...contract,
          status: 'expired',
          updatedAt: new Date().toISOString(),
        }
        await writeDataFile('contracts.json', contracts)
        
        return NextResponse.json(
          { error: 'This contract has expired. Please contact us to request a new contract.' },
          { status: 410 }
        )
      }
    }

    if (contract.status === 'expired') {
      return NextResponse.json(
        { error: 'This contract has expired. Please contact us to request a new contract.' },
        { status: 410 }
      )
    }

    if (contract.status === 'signed') {
      return NextResponse.json(
        { error: 'This contract has already been signed' },
        { status: 410 }
      )
    }
    
    return NextResponse.json({ contract })
  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
      { status: 500 }
    )
  }
}

