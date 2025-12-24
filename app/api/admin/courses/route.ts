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
    let courses: Course[]
    try {
      courses = Array.isArray(rawCourses)
        ? rawCourses.map((course, index) => {
            try {
              const normalized = normalizeCourse(course)
              // Always regenerate slug from current title to ensure it's in sync
              // This removes old slugs when title changes
              // Ensure title exists and is not empty before generating slug
              if (normalized.title && normalized.title.trim().length > 0) {
                normalized.slug = generateCourseSlug(normalized.title)
              } else {
                // If title is empty, use undefined for slug
                normalized.slug = undefined
              }
              
              // Debug logging
              console.log(`[Admin Courses API] Normalized course: "${normalized.title}"`)
              console.log(`[Admin Courses API]   Image URL: ${normalized.imageUrl || 'NONE'}`)
              console.log(`[Admin Courses API]   Instructor: ${normalized.instructor?.name || 'NONE'}`)
              console.log(`[Admin Courses API]   What You'll Learn: ${normalized.whatYoullLearn?.length || 0} items`)
              
              return normalized
            } catch (courseError) {
              console.error(`[Admin Courses API] Failed to normalize course at index ${index}:`, courseError)
              throw new Error(`Failed to normalize course "${course?.title || 'unknown'}": ${courseError instanceof Error ? courseError.message : 'Unknown error'}`)
            }
          })
        : []
    } catch (normalizeError) {
      console.error('[Admin Courses API] Failed to normalize courses:', normalizeError)
      throw new Error(`Failed to normalize courses: ${normalizeError instanceof Error ? normalizeError.message : 'Unknown error'}`)
    }

    // Normalize discounts
    let discounts: CourseDiscount[]
    try {
      discounts = Array.isArray(rawDiscounts)
        ? rawDiscounts.map((discount, index) => {
            try {
              return normalizeDiscount(discount)
            } catch (discountError) {
              console.error(`[Admin Courses API] Failed to normalize discount at index ${index}:`, discountError)
              throw new Error(`Failed to normalize discount: ${discountError instanceof Error ? discountError.message : 'Unknown error'}`)
            }
          })
        : []
    } catch (normalizeError) {
      console.error('[Admin Courses API] Failed to normalize discounts:', normalizeError)
      throw new Error(`Failed to normalize discounts: ${normalizeError instanceof Error ? normalizeError.message : 'Unknown error'}`)
    }

    // Preserve banner settings
    const catalog: CourseCatalog = { 
      courses, 
      discounts,
      coursesDiscountBannerEnabled: coursesDiscountBannerEnabled !== undefined ? coursesDiscountBannerEnabled : undefined,
      coursesDiscountBannerCourseId: coursesDiscountBannerCourseId || undefined
    }

    // Validate catalog structure before saving
    if (!Array.isArray(catalog.courses)) {
      throw new Error('Invalid catalog structure: courses must be an array')
    }
    if (!Array.isArray(catalog.discounts)) {
      throw new Error('Invalid catalog structure: discounts must be an array')
    }

    // Validate that all courses have required fields
    for (let i = 0; i < catalog.courses.length; i++) {
      const course = catalog.courses[i]
      if (!course.id || typeof course.id !== 'string') {
        throw new Error(`Course at index ${i} is missing a valid ID`)
      }
      if (!course.title || typeof course.title !== 'string' || course.title.trim().length === 0) {
        throw new Error(`Course at index ${i} (ID: ${course.id}) is missing a valid title`)
      }
      if (typeof course.priceUSD !== 'number') {
        throw new Error(`Course at index ${i} (ID: ${course.id}) has invalid priceUSD`)
      }
    }

    // Validate that all discounts have required fields
    for (let i = 0; i < catalog.discounts.length; i++) {
      const discount = catalog.discounts[i]
      if (!discount.id || typeof discount.id !== 'string') {
        throw new Error(`Discount at index ${i} is missing a valid ID`)
      }
      if (!discount.courseId || typeof discount.courseId !== 'string') {
        throw new Error(`Discount at index ${i} (ID: ${discount.id}) is missing a valid courseId`)
      }
    }

    console.log('[Admin Courses API] Saving catalog with', courses.length, 'courses')
    
    // Validate that catalog can be serialized
    let catalogJson: string
    try {
      catalogJson = JSON.stringify(catalog, null, 2)
    } catch (jsonError) {
      console.error('[Admin Courses API] Failed to serialize catalog to JSON:', jsonError)
      throw new Error('Failed to serialize course data. Please check for circular references or invalid data.')
    }
    
    // CRITICAL: Always write directly to local file system first
    // This ensures changes are immediately visible on the public courses page
    try {
      const filePath = path.join(process.cwd(), 'data', 'courses.json')
      const fs = await import('fs/promises')
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, catalogJson, 'utf-8')
      console.log('[Admin Courses API] ✓ Catalog saved to local file system')
    } catch (fileError) {
      console.error('[Admin Courses API] Failed to write to local file:', fileError)
      throw new Error(`Failed to save courses file: ${fileError instanceof Error ? fileError.message : 'Unknown file system error'}`)
    }
    
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

    // Record activity (don't fail if this fails)
    try {
      await recordActivity({
        module: 'courses',
        action: 'update',
        performedBy,
        summary: `Updated course catalog (${courses.length} courses, ${discounts.length} discounts)`,
        targetId: 'course-catalog',
        targetType: 'courses',
        details: catalog,
      })
    } catch (activityError) {
      console.warn('[Admin Courses API] Failed to record activity (non-critical):', activityError)
      // Don't fail the request - file save succeeded
    }

    // Revalidate paths (don't fail if this fails - it's a cache optimization)
    try {
      revalidatePath('/admin/courses')
      revalidatePath('/api/admin/courses')
      revalidatePath('/api/courses')
      revalidatePath('/courses')
      // Revalidate all course detail pages
      courses.forEach(course => {
        if (course.title && course.title.trim().length > 0) {
          try {
            const slug = generateCourseSlug(course.title)
            if (slug && slug.length > 0) {
              revalidatePath(`/course/${slug}`)
            }
          } catch (slugError) {
            console.warn(`[Admin Courses API] Failed to revalidate path for course "${course.title}":`, slugError)
          }
        }
      })
    } catch (revalidateError) {
      console.warn('[Admin Courses API] Failed to revalidate paths (non-critical):', revalidateError)
      // Don't fail the request - file save succeeded
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Log detailed error information
    console.error('[Admin Courses API] Error saving courses:', error)
    if (error instanceof Error) {
      console.error('[Admin Courses API] Error message:', error.message)
      console.error('[Admin Courses API] Error stack:', error.stack)
    }
    
    // Return more specific error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { 
        error: 'Failed to save courses',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }, 
      { status: 500 }
    )
  }
}

