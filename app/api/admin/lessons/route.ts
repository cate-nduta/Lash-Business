import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { loadCourseStructure } from '@/lib/course-structure-server'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')
    const lessonId = searchParams.get('lessonId')

    if (moduleId && lessonId) {
      // Get specific lesson content
      const courseStructure = loadCourseStructure()
      try {
        const lessonFile = path.join(process.cwd(), `course-content/module-${moduleId}/lesson-${lessonId}.md`)
        const content = await readFile(lessonFile, 'utf-8')
        
        const courseModule = courseStructure.find(m => m.id === moduleId)
        const lesson = courseModule?.lessons.find(l => l.id === lessonId)
        
        return NextResponse.json({
          success: true,
          content,
          module: courseModule ? { id: courseModule.id, title: courseModule.title } : null,
          lesson: lesson ? { id: lesson.id, title: lesson.title, description: lesson.description, estimatedTime: lesson.estimatedTime } : null,
        })
      } catch (error) {
        // File doesn't exist, return empty content
        const courseModule = courseStructure.find(m => m.id === moduleId)
        const lesson = courseModule?.lessons.find(l => l.id === lessonId)
        
        return NextResponse.json({
          success: true,
          content: '',
          module: courseModule ? { id: courseModule.id, title: courseModule.title } : null,
          lesson: lesson ? { id: lesson.id, title: lesson.title, description: lesson.description, estimatedTime: lesson.estimatedTime } : null,
        })
      }
    }

    // Get all lessons
    const courseStructure = loadCourseStructure()
    const allLessons = courseStructure.flatMap(module =>
      module.lessons.map(lesson => ({
        moduleId: module.id,
        moduleTitle: module.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonDescription: lesson.description,
        estimatedTime: lesson.estimatedTime,
      }))
    )

    return NextResponse.json({ success: true, lessons: allLessons })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading lessons:', error)
    return NextResponse.json({ error: 'Failed to load lessons' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const { moduleId, lessonId, content } = await request.json()

    if (!moduleId || !lessonId) {
      return NextResponse.json({ error: 'Module ID and Lesson ID are required' }, { status: 400 })
    }

    // Ensure directory exists
    const lessonDir = path.join(process.cwd(), `course-content/module-${moduleId}`)
    const lessonFile = path.join(lessonDir, `lesson-${lessonId}.md`)

    try {
      // Create directory if it doesn't exist
      const { mkdir } = await import('fs/promises')
      await mkdir(lessonDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, that's fine
    }

    // Write the content
    await writeFile(lessonFile, content || '', 'utf-8')

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving lesson:', error)
    return NextResponse.json({ error: 'Failed to save lesson' }, { status: 500 })
  }
}

