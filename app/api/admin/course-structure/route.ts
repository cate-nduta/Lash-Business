import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { courseStructure as defaultCourseStructure, type Module } from '@/lib/course-structure'

export const revalidate = 0
export const dynamic = 'force-dynamic'

const COURSE_STRUCTURE_FILE = path.join(process.cwd(), 'data', 'course-structure.json')

export async function GET() {
  try {
    await requireAdminAuth()
    
    // Try to load custom course structure, fallback to default
    let structure: Module[]
    try {
      const data = await readFile(COURSE_STRUCTURE_FILE, 'utf-8')
      structure = JSON.parse(data)
    } catch (error) {
      // File doesn't exist, use default
      structure = defaultCourseStructure
    }

    return NextResponse.json({ structure }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading course structure:', error)
    return NextResponse.json({ error: 'Failed to load course structure' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const { structure } = await request.json()

    if (!Array.isArray(structure)) {
      return NextResponse.json({ error: 'Invalid structure format' }, { status: 400 })
    }

    // Ensure directory exists
    const dataDir = path.join(process.cwd(), 'data')
    try {
      await readFile(dataDir, 'utf-8')
    } catch {
      // Directory might not exist, that's fine - writeFile will create it
    }

    // Write the structure
    await writeFile(COURSE_STRUCTURE_FILE, JSON.stringify(structure, null, 2), 'utf-8')

    await recordActivity({
      module: 'courses',
      action: 'update',
      performedBy,
      summary: 'Updated course structure',
      targetId: 'course-structure',
      targetType: 'course-structure',
      details: { structure },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving course structure:', error)
    return NextResponse.json({ error: 'Failed to save course structure' }, { status: 500 })
  }
}

