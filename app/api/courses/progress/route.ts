import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { type CoursePurchase } from '@/types/course'
import { getClientUserId } from '@/lib/client-auth'

export const revalidate = 0
export const dynamic = 'force-dynamic'

interface LessonProgress {
  moduleId: string
  lessonId: string
  completed: boolean
  completedAt?: string
}

interface CourseProgressData {
  courseId: string
  userId?: string // Primary identifier (if user is logged in)
  email: string // Fallback for users not logged in
  lessons: LessonProgress[]
  lastUpdated: string
}

interface CourseProgressFile {
  progress: CourseProgressData[]
}

/**
 * GET - Load progress for a course (by userId if logged in, or email)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const email = searchParams.get('email')

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Try to get userId from session (if user is logged in)
    let userId: string | null = null
    try {
      userId = await getClientUserId()
    } catch (error) {
      // Not logged in - that's okay, will use email
    }

    // If not logged in and no email provided, require email
    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Email is required if not logged in' },
        { status: 400 }
      )
    }

    // Verify user has access to this course
    const purchases = await readDataFile<{ purchases: CoursePurchase[] }>(
      'course-purchases.json',
      { purchases: [] }
    )
    const normalizedEmail = email?.toLowerCase().trim() || ''

    // Check if course is free or user has purchased it
    const catalog = await readDataFile<any>('courses.json', { courses: [] })
    const course = catalog.courses?.find((c: any) => c.id === courseId && c.isActive)

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // For paid courses, verify purchase
    if (course.priceUSD > 0) {
      const purchase = purchases.purchases.find(
        (p) =>
          p.courseId === courseId &&
          ((userId && p.userId === userId) || (normalizedEmail && p.email === normalizedEmail)) &&
          p.paymentStatus === 'completed' &&
          p.accessGranted === true
      )

      if (!purchase) {
        return NextResponse.json(
          { error: 'Access denied. Please purchase the course first.' },
          { status: 403 }
        )
      }
      
      // If we found purchase by email but user is logged in, update purchase with userId
      if (userId && purchase && !purchase.userId) {
        purchase.userId = userId
        await writeDataFile('course-purchases.json', { purchases: purchases.purchases })
      }
    }

    // Load progress
    const progressData = await readDataFile<CourseProgressFile>(
      'course-progress.json',
      { progress: [] }
    )

    // Find progress by userId (preferred) or email (fallback)
    let userProgress = userId
      ? progressData.progress.find(
          (p) => p.courseId === courseId && p.userId === userId
        )
      : null

    if (!userProgress && normalizedEmail) {
      userProgress = progressData.progress.find(
        (p) => p.courseId === courseId && p.email === normalizedEmail
      )
      
      // If found by email and user is logged in, update to use userId
      if (userProgress && userId) {
        userProgress.userId = userId
        await writeDataFile('course-progress.json', progressData)
      }
    }

    if (!userProgress) {
      return NextResponse.json({
        courseId,
        userId: userId || undefined,
        email: normalizedEmail || undefined,
        lessons: [],
        lastUpdated: new Date().toISOString(),
      })
    }

    return NextResponse.json(userProgress)
  } catch (error) {
    console.error('Error loading course progress:', error)
    return NextResponse.json(
      { error: 'Failed to load progress' },
      { status: 500 }
    )
  }
}

/**
 * POST - Save progress for a course (by userId if logged in, or email)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { courseId, email, lessons } = body

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Try to get userId from session (if user is logged in)
    let userId: string | null = null
    try {
      userId = await getClientUserId()
    } catch (error) {
      // Not logged in - that's okay, will use email
    }

    // If not logged in and no email provided, require email
    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Email is required if not logged in' },
        { status: 400 }
      )
    }

    const normalizedEmail = email?.toLowerCase().trim() || ''

    // Verify user has access to this course
    const purchases = await readDataFile<{ purchases: CoursePurchase[] }>(
      'course-purchases.json',
      { purchases: [] }
    )

    const catalog = await readDataFile<any>('courses.json', { courses: [] })
    const course = catalog.courses?.find((c: any) => c.id === courseId && c.isActive)

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // For paid courses, verify purchase
    if (course.priceUSD > 0) {
      const purchase = purchases.purchases.find(
        (p) =>
          p.courseId === courseId &&
          ((userId && p.userId === userId) || (normalizedEmail && p.email === normalizedEmail)) &&
          p.paymentStatus === 'completed' &&
          p.accessGranted === true
      )

      if (!purchase) {
        return NextResponse.json(
          { error: 'Access denied. Please purchase the course first.' },
          { status: 403 }
        )
      }
      
      // If we found purchase by email but user is logged in, update purchase with userId
      if (userId && purchase && !purchase.userId) {
        purchase.userId = userId
        await writeDataFile('course-purchases.json', { purchases: purchases.purchases })
      }
    }

    // Load existing progress
    const progressData = await readDataFile<CourseProgressFile>(
      'course-progress.json',
      { progress: [] }
    )

    // Find existing progress by userId (preferred) or email (fallback)
    let existingIndex = userId
      ? progressData.progress.findIndex(
          (p) => p.courseId === courseId && p.userId === userId
        )
      : -1

    if (existingIndex === -1 && normalizedEmail) {
      existingIndex = progressData.progress.findIndex(
        (p) => p.courseId === courseId && p.email === normalizedEmail
      )
    }

    const progressEntry: CourseProgressData = {
      courseId,
      userId: userId || undefined,
      email: normalizedEmail || undefined,
      lessons: lessons || [],
      lastUpdated: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      progressData.progress[existingIndex] = progressEntry
    } else {
      progressData.progress.push(progressEntry)
    }

    await writeDataFile('course-progress.json', progressData)

    return NextResponse.json({
      success: true,
      progress: progressEntry,
    })
  } catch (error) {
    console.error('Error saving course progress:', error)
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update a specific lesson's completion status
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { courseId, email, moduleId, lessonId, completed } = body

    if (!courseId || !moduleId || !lessonId || typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'Course ID, module ID, lesson ID, and completed status are required' },
        { status: 400 }
      )
    }

    // Try to get userId from session (if user is logged in)
    let userId: string | null = null
    try {
      userId = await getClientUserId()
    } catch (error) {
      // Not logged in - that's okay, will use email
    }

    // If not logged in and no email provided, require email
    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Email is required if not logged in' },
        { status: 400 }
      )
    }

    const normalizedEmail = email?.toLowerCase().trim() || ''

    // Verify user has access
    const purchases = await readDataFile<{ purchases: CoursePurchase[] }>(
      'course-purchases.json',
      { purchases: [] }
    )

    const catalog = await readDataFile<any>('courses.json', { courses: [] })
    const course = catalog.courses?.find((c: any) => c.id === courseId && c.isActive)

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (course.priceUSD > 0) {
      const purchase = purchases.purchases.find(
        (p) =>
          p.courseId === courseId &&
          ((userId && p.userId === userId) || (normalizedEmail && p.email === normalizedEmail)) &&
          p.paymentStatus === 'completed' &&
          p.accessGranted === true
      )

      if (!purchase) {
        return NextResponse.json(
          { error: 'Access denied. Please purchase the course first.' },
          { status: 403 }
        )
      }
      
      // If we found purchase by email but user is logged in, update purchase with userId
      if (userId && purchase && !purchase.userId) {
        purchase.userId = userId
        await writeDataFile('course-purchases.json', { purchases: purchases.purchases })
      }
    }

    // Load existing progress
    const progressData = await readDataFile<CourseProgressFile>(
      'course-progress.json',
      { progress: [] }
    )

    // Find progress by userId (preferred) or email (fallback)
    let userProgress = userId
      ? progressData.progress.find(
          (p) => p.courseId === courseId && p.userId === userId
        )
      : null

    if (!userProgress && normalizedEmail) {
      userProgress = progressData.progress.find(
        (p) => p.courseId === courseId && p.email === normalizedEmail
      )
    }

    if (!userProgress) {
      userProgress = {
        courseId,
        userId: userId || undefined,
        email: normalizedEmail || undefined,
        lessons: [],
        lastUpdated: new Date().toISOString(),
      }
      progressData.progress.push(userProgress)
    } else if (userId && !userProgress.userId) {
      // Update existing progress to use userId
      userProgress.userId = userId
    }

    // Update or add lesson progress
    const lessonIndex = userProgress.lessons.findIndex(
      (l) => l.moduleId === moduleId && l.lessonId === lessonId
    )

    if (lessonIndex >= 0) {
      userProgress.lessons[lessonIndex].completed = completed
      if (completed) {
        userProgress.lessons[lessonIndex].completedAt = new Date().toISOString()
      } else {
        delete userProgress.lessons[lessonIndex].completedAt
      }
    } else {
      userProgress.lessons.push({
        moduleId,
        lessonId,
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
      })
    }

    userProgress.lastUpdated = new Date().toISOString()

    await writeDataFile('course-progress.json', progressData)

    return NextResponse.json({
      success: true,
      progress: userProgress,
    })
  } catch (error) {
    console.error('Error updating lesson progress:', error)
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    )
  }
}

