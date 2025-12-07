import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { normalizeServiceCatalog } from '@/lib/services-utils'

export const runtime = 'nodejs'
export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const raw = await readDataFile('services.json', {})
    const { catalog, changed } = normalizeServiceCatalog(raw)

    if (changed) {
      await writeDataFile('services.json', catalog)
    }

    return NextResponse.json(catalog, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes, serve stale for 10 minutes
      },
    })
  } catch (error) {
    console.error('Error loading services:', error)
    return NextResponse.json({ services: [] }, { status: 500 })
  }
}

