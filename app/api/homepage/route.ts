import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const runtime = 'nodejs'
export const revalidate = 60 // Revalidate every 60 seconds

export async function GET(request: NextRequest) {
  try {
    const homepage = await readDataFile('homepage.json', {})
    return NextResponse.json(homepage, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error loading homepage content:', error)
    return NextResponse.json({ homepage: null }, { 
      status: 500,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
      },
    })
  }
}

