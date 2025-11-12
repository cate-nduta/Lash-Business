import { NextResponse } from 'next/server'
import { loadTerms } from '@/lib/terms-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const terms = await loadTerms()
    return NextResponse.json(terms, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error loading terms & conditions:', error)
    return NextResponse.json(
      {
        version: 1,
        updatedAt: null,
        sections: [],
        error: 'Failed to load terms & conditions',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  }
}


