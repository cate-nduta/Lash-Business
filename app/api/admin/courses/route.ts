import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { normalizeCourse, normalizeDiscount, generateCourseSlug } from '@/lib/courses-utils'
import { type Course, type CourseDiscount, type CourseCatalog } from '@/types/course'
import { readFileSync } from 'fs'
import path from 'path'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminAuth()
    
    // CRITICAL FIX: Always read directly from local file system first
    // Supabase may have outdated data with different IDs
    // The local file has the correct data with both courses
    let catalog: CourseCatalog = { courses: [], discounts: [] }
    
    try {
      const filePath = path.join(process.cwd(), 'data', 'courses.json')
      const fileContent = readFileSync(filePath, 'utf-8')
      catalog = JSON.parse(fileContent) as CourseCatalog
      console.log(`[Admin Courses API] ✓ Read from local file: Found ${catalog.courses.length} courses`)
      catalog.courses.forEach((c: Course) => {
        console.log(`[Admin Courses API]   - "${c.title}" (ID: ${c.id}, Active: ${c.isActive})`)
      })
    } catch (fileError) {
      console.warn(`[Admin Courses API] Failed to read from local file, falling back to readDataFile:`, fileError)
      // Fallback to readDataFile if local file read fails
      const raw = await readDataFile<CourseCatalog>('courses.json', { courses: [], discounts: [] })
      catalog = {
        courses: Array.isArray(raw.courses) ? raw.courses : [],
        discounts: Array.isArray(raw.discounts) ? raw.discounts : [],
        coursesDiscountBannerEnabled: raw.coursesDiscountBannerEnabled !== undefined ? raw.coursesDiscountBannerEnabled : undefined,
        coursesDiscountBannerCourseId: raw.coursesDiscountBannerCourseId || undefined,
      }
    }
    
    // Ensure structure exists and preserve banner settings
    const finalCatalog: CourseCatalog = {
      courses: Array.isArray(catalog.courses) ? catalog.courses : [],
      discounts: Array.isArray(catalog.discounts) ? catalog.discounts : [],
      coursesDiscountBannerEnabled: catalog.coursesDiscountBannerEnabled !== undefined ? catalog.coursesDiscountBannerEnabled : undefined,
      coursesDiscountBannerCourseId: catalog.coursesDiscountBannerCourseId || undefined,
    }

    // Debug log
    console.log(`[Admin Courses API] Returning ${finalCatalog.courses.length} courses`)
    finalCatalog.courses.forEach((c: Course) => {
      console.log(`[Admin Courses API] Course: "${c.title}" (ID: ${c.id}, Active: ${c.isActive})`)
    })

    return NextResponse.json(finalCatalog, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading courses:', error)
    return NextResponse.json({ error: 'Failed to load courses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const payload = await request.json()
    const { courses: rawCourses, discounts: rawDiscounts, coursesDiscountBannerEnabled, coursesDiscountBannerCourseId } = payload

    // Normalize courses and ensure slugs match current titles
    const courses: Course[] = Array.isArray(rawCourses)
      ? rawCourses.map(course => {
          const normalized = normalizeCourse(course)
          // Always regenerate slug from current title to ensure it's in sync
          // This removes old slugs when title changes
          normalized.slug = generateCourseSlug(normalized.title)
          
          // Debug logging
          console.log(`[Admin Courses API] Normalized course: "${normalized.title}"`)
          console.log(`[Admin Courses API]   Image URL: ${normalized.imageUrl || 'NONE'}`)
          console.log(`[Admin Courses API]   Instructor: ${normalized.instructor?.name || 'NONE'}`)
          console.log(`[Admin Courses API]   What You'll Learn: ${normalized.whatYoullLearn?.length || 0} items`)
          
          return normalized
        })
      : []

    // Normalize discounts
    const discounts: CourseDiscount[] = Array.isArray(rawDiscounts)
      ? rawDiscounts.map(normalizeDiscount)
      : []

    // Preserve banner settings
    const catalog: CourseCatalog = { 
      courses, 
      discounts,
      coursesDiscountBannerEnabled: coursesDiscountBannerEnabled !== undefined ? coursesDiscountBannerEnabled : undefined,
      coursesDiscountBannerCourseId: coursesDiscountBannerCourseId || undefined
    }

    console.log('[Admin Courses API] Saving catalog with', courses.length, 'courses')
    
    // CRITICAL: Always write directly to local file system first
    // This ensures changes are immediately visible on the public courses page
    const filePath = path.join(process.cwd(), 'data', 'courses.json')
    const fs = await import('fs/promises')
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(catalog, null, 2), 'utf-8')
    console.log('[Admin Courses API] ✓ Catalog saved to local file system')
    
    // Also write via writeDataFile (which may sync to Supabase if configured)
    // This ensures data is backed up to Supabase if it's configured
    try {
      await writeDataFile('courses.json', catalog)
      console.log('[Admin Courses API] ✓ Catalog synced to Supabase (if configured)')
    } catch (writeError) {
      console.warn('[Admin Courses API] Warning: Failed to sync to Supabase, but local file was saved:', writeError)
      // Don't fail the request - local file save succeeded
    }
    
    console.log('[Admin Courses API] Catalog saved successfully')

    await recordActivity({
      module: 'courses',
      action: 'update',
      performedBy,
      summary: `Updated course catalog (${courses.length} courses, ${discounts.length} discounts)`,
      targetId: 'course-catalog',
      targetType: 'courses',
      details: catalog,
    })

    revalidatePath('/admin/courses')
    revalidatePath('/api/admin/courses')
    revalidatePath('/api/courses')
    revalidatePath('/courses')
    // Revalidate all course detail pages
    courses.forEach(course => {
      const slug = generateCourseSlug(course.title)
      revalidatePath(`/course/${slug}`)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving courses:', error)
    return NextResponse.json({ error: 'Failed to save courses' }, { status: 500 })
  }
}

