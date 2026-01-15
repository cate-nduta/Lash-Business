import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SpinWheelCodesData {
  codes: any[]
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminAuth()

    // Clear all codes
    const emptyData: SpinWheelCodesData = { codes: [] }
    await writeDataFile('spin-wheel-codes.json', emptyData)

    return NextResponse.json({
      success: true,
      message: 'All spin wheel winners have been deleted',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting all spin wheel winners:', error)
    return NextResponse.json(
      { error: 'Failed to delete all winners', details: error.message },
      { status: 500 }
    )
  }
}

