import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const homepage = await readDataFile('homepage.json', {})
    return NextResponse.json(homepage)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading homepage data:', error)
    return NextResponse.json({ homepage: null }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const homepage = await request.json()
    await writeDataFile('homepage.json', homepage)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving homepage data:', error)
    return NextResponse.json({ error: 'Failed to save homepage data' }, { status: 500 })
  }
}

