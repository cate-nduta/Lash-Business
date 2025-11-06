import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export async function GET() {
  try {
    await requireAdminAuth()
    const homepage = readDataFile('homepage.json')
    return NextResponse.json(homepage)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to load homepage content' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const data = await request.json()
    writeDataFile('homepage.json', data)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save homepage content' }, { status: 500 })
  }
}

