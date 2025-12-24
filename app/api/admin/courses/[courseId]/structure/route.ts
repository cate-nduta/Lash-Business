import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { writeDataFile, readDataFile } from '@/lib/data-utils'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { type Module } from '@/lib/course-structure'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    await requireAdminAuth()
    const courseId = params.courseId

    // Load course-specific structure
    const structureFile = courseId === 'course-ai-booking-website'
      ? path.join(process.cwd(), 'data', 'course-structure-ai.json')
      : path.join(process.cwd(), 'data', 'course-structure.json')

    try {
      const fileContent = readFileSync(structureFile, 'utf-8')
      const structure = JSON.parse(fileContent)
      return NextResponse.json({ structure })
    } catch (error) {
      // File doesn't exist, return empty structure
      return NextResponse.json({ structure: [] })
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading course structure:', error)
    return NextResponse.json({ error: 'Failed to load course structure' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    await requireAdminAuth()
    const courseId = params.courseId
    const { structure } = await request.json()

    if (!Array.isArray(structure)) {
      return NextResponse.json({ error: 'Structure must be an array' }, { status: 400 })
    }

    // Save to course-specific structure file
    const structureFile = courseId === 'course-ai-booking-website'
      ? path.join(process.cwd(), 'data', 'course-structure-ai.json')
      : path.join(process.cwd(), 'data', 'course-structure.json')

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data')
    const fs = await import('fs/promises')
    await fs.mkdir(dataDir, { recursive: true })

    // Write structure to file
    writeFileSync(structureFile, JSON.stringify(structure, null, 2), 'utf-8')

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving course structure:', error)
    return NextResponse.json({ error: 'Failed to save course structure' }, { status: 500 })
  }
}



