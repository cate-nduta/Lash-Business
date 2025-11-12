import { NextResponse } from 'next/server'
import { loadPolicies } from '@/lib/policies-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const policies = await loadPolicies()
    return NextResponse.json(
      {
        variables: policies.variables,
        sections: policies.sections,
        updatedAt: policies.updatedAt,
        version: policies.version,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error('Error loading policies:', error)
    return NextResponse.json(
      {
        variables: {},
        sections: [],
        updatedAt: null,
        version: 1,
        error: 'Failed to load policies',
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

