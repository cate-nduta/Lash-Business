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
    const contracts = await readDataFile<Contract[]>('contracts.json', [])
    const contract = contracts.find(c => c.contractToken === params.token)
    
    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    if (contract.status === 'expired') {
      return NextResponse.json(
        { error: 'This contract has expired' },
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

