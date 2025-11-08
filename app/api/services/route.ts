import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const services = await readDataFile('services.json', [])
    return NextResponse.json(services, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error loading services:', error)
    return NextResponse.json({ services: [] }, { status: 500 })
  }
}

