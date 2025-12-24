import { NextRequest, NextResponse } from 'next/server'
import { loadCourseStructure } from '@/lib/course-structure-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId
    
    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    const courseStructure = loadCourseStructure(courseId)

    return NextResponse.json(
      { structure: courseStructure },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    console.error('Error loading course structure:', error)
    return NextResponse.json(
      { error: 'Failed to load course structure' },
      { status: 500 }
    )
  }
}

