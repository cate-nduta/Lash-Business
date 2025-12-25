import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { BuildProject } from '@/app/api/admin/labs/build-projects/route'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const projects = await readDataFile<BuildProject[]>('labs-build-projects.json', [])
    const project = projects.find(p => p.showcaseBookingToken === params.token)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or invalid token' },
        { status: 404 }
      )
    }

    return NextResponse.json({ project })
  } catch (error: any) {
    console.error('Error fetching project info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project info' },
      { status: 500 }
    )
  }
}

