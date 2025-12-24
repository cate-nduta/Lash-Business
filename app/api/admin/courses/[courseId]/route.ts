import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { normalizeCourse } from '@/lib/courses-utils'
import { type Course, type CourseCatalog } from '@/types/course'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const courseId = params.courseId
    const courseData = await request.json()

    const raw = await readDataFile<CourseCatalog>('courses.json', { courses: [], discounts: [] })
    const catalog: CourseCatalog = {
      courses: Array.isArray(raw.courses) ? raw.courses : [],
      discounts: Array.isArray(raw.discounts) ? raw.discounts : [],
    }

    const courseIndex = catalog.courses.findIndex(c => c.id === courseId)
    if (courseIndex === -1) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Update the course
    const updatedCourse = normalizeCourse({ ...catalog.courses[courseIndex], ...courseData, id: courseId })
    catalog.courses[courseIndex] = updatedCourse

    await writeDataFile('courses.json', catalog)

    await recordActivity({
      module: 'courses',
      action: 'update',
      performedBy,
      summary: `Updated course: ${updatedCourse.title}`,
      targetId: courseId,
      targetType: 'course',
      details: updatedCourse,
    })

    revalidatePath('/admin/courses')
    revalidatePath('/api/admin/courses')

    return NextResponse.json({ success: true, course: updatedCourse })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating course:', error)
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const courseId = params.courseId

    const raw = await readDataFile<CourseCatalog>('courses.json', { courses: [], discounts: [] })
    const catalog: CourseCatalog = {
      courses: Array.isArray(raw.courses) ? raw.courses : [],
      discounts: Array.isArray(raw.discounts) ? raw.discounts : [],
    }

    const courseIndex = catalog.courses.findIndex(c => c.id === courseId)
    if (courseIndex === -1) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const deletedCourse = catalog.courses[courseIndex]

    // Remove the course
    catalog.courses.splice(courseIndex, 1)

    // Also remove any discounts associated with this course
    catalog.discounts = catalog.discounts.filter(d => d.courseId !== courseId)

    await writeDataFile('courses.json', catalog)

    await recordActivity({
      module: 'courses',
      action: 'delete',
      performedBy,
      summary: `Deleted course: ${deletedCourse.title}`,
      targetId: courseId,
      targetType: 'course',
      details: deletedCourse,
    })

    revalidatePath('/admin/courses')
    revalidatePath('/api/admin/courses')

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting course:', error)
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}



