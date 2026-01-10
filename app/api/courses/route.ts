import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { type CourseCatalog } from '@/types/course'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Use readDataFile which handles both Supabase (production) and local file system (development)
    // This ensures it works in both localhost and production environments
    let catalog: CourseCatalog = { courses: [], discounts: [] }
    
    try {
      catalog = await readDataFile<CourseCatalog>('courses.json', { courses: [], discounts: [] })
      console.log(`[Courses API] ✓ Loaded courses: Found ${catalog.courses.length} courses`)
      catalog.courses.forEach(c => {
        console.log(`[Courses API]   - "${c.title}" (ID: ${c.id}, Active: ${c.isActive})`)
      })
    } catch (readError: any) {
      console.error(`[Courses API] Failed to read courses data:`, readError)
      console.error(`[Courses API] Error details:`, readError?.message, readError?.stack)
      // Use empty catalog as fallback
      catalog = { courses: [], discounts: [] }
    }
    
    // Ensure catalog has required properties
    if (!catalog) {
      catalog = { courses: [], discounts: [] }
    }
    if (!Array.isArray(catalog.courses)) {
      catalog.courses = []
    }
    if (!Array.isArray(catalog.discounts)) {
      catalog.discounts = []
    }
    
    // Only return active courses - handle boolean true
    let activeCourses = (catalog.courses || []).filter(course => {
      const isActive = course.isActive === true
      if (!isActive) {
        console.log(`[Courses API] Filtering out inactive course: "${course.title}" (ID: ${course.id}, isActive: ${course.isActive}, type: ${typeof course.isActive})`)
      }
      return isActive
    })
    
    // Ensure we have courses - if not, log warning
    if (activeCourses.length === 0) {
      console.warn('[Courses API] WARNING: No active courses found!')
      console.warn(`[Courses API] Total courses in catalog: ${catalog.courses.length}`)
      catalog.courses.forEach(c => {
        console.warn(`[Courses API] Course "${c.title}" (ID: ${c.id}) - isActive: ${c.isActive} (type: ${typeof c.isActive})`)
      })
    }
    
    // Debug: Log courses being returned (always log to help debug)
    console.log(`[Courses API] ========================================`)
    console.log(`[Courses API] Found ${catalog.courses.length} total courses in catalog`)
    console.log(`[Courses API] Found ${activeCourses.length} active courses after filtering`)
    console.log(`[Courses API] ========================================`)
    catalog.courses.forEach((c, index) => {
      console.log(`[Courses API] Course ${index + 1}: "${c.title}"`)
      console.log(`[Courses API]   - ID: ${c.id}`)
      console.log(`[Courses API]   - isActive: ${c.isActive} (type: ${typeof c.isActive})`)
      console.log(`[Courses API]   - Will be included: ${activeCourses.some(ac => ac.id === c.id)}`)
    })
    console.log(`[Courses API] ========================================`)
    activeCourses.forEach((c, index) => {
      console.log(`[Courses API] ✓ Active course ${index + 1} being returned: "${c.title}" (ID: ${c.id})`)
    })
    console.log(`[Courses API] ========================================`)
    
    // Apply active discounts to courses
    const now = new Date()
    const activeDiscounts = (catalog.discounts || []).filter(discount => {
      if (!discount || !discount.isActive) return false
      
      // Check if discount is within date range
      if (discount.startDate) {
        try {
          const startDate = new Date(discount.startDate)
          if (now < startDate) return false
        } catch (e) {
          console.warn(`[Courses API] Invalid startDate for discount:`, discount.startDate)
          return false
        }
      }
      
      if (discount.endDate) {
        try {
          const endDate = new Date(discount.endDate)
          // Set end date to end of day
          endDate.setHours(23, 59, 59, 999)
          if (now > endDate) return false
        } catch (e) {
          console.warn(`[Courses API] Invalid endDate for discount:`, discount.endDate)
          return false
        }
      }
      
      return true
    })
    
    // Apply discounts to matching courses
    activeCourses = activeCourses.map(course => {
      // Find active discount for this course
      const courseDiscount = activeDiscounts.find(d => d.courseId === course.id)
      
      if (courseDiscount) {
        // Apply discount to course
        const courseWithDiscount = { ...course }
        
        if (courseDiscount.type === 'percentage') {
          // Set discountPercent
          courseWithDiscount.discountPercent = courseDiscount.value
          // Set discountExpiryDate if endDate exists
          if (courseDiscount.endDate) {
            courseWithDiscount.discountExpiryDate = courseDiscount.endDate
          }
        } else if (courseDiscount.type === 'fixed') {
          // For fixed discounts, calculate the percentage
          const originalPrice = course.originalPriceUSD || course.priceUSD
          if (originalPrice > 0) {
            const discountPercent = Math.round((courseDiscount.value / originalPrice) * 100)
            courseWithDiscount.discountPercent = discountPercent
            if (courseDiscount.endDate) {
              courseWithDiscount.discountExpiryDate = courseDiscount.endDate
            }
          }
        }
        
        return courseWithDiscount
      }
      
      return course
    })
    
    // Debug: Log course data including imageUrl
    console.log('[Courses API] Final courses being returned:')
    activeCourses.forEach(c => {
      console.log(`[Courses API]   - "${c.title}"`)
      console.log(`[Courses API]     Image URL: ${c.imageUrl || 'NONE'}`)
      console.log(`[Courses API]     Instructor: ${c.instructor?.name || 'NONE'}`)
      console.log(`[Courses API]     What You'll Learn: ${c.whatYoullLearn?.length || 0} items`)
    })
    
    // Get banner setting from catalog - return the actual value (true, false, or undefined)
    // Component will handle the logic explicitly
    const bannerCourseId = catalog?.coursesDiscountBannerCourseId
    
    return NextResponse.json({ 
      courses: activeCourses || [],
      coursesDiscountBannerEnabled: catalog?.coursesDiscountBannerEnabled ?? false, // Return actual value, not computed
      coursesDiscountBannerCourseId: bannerCourseId
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  } catch (error: any) {
    console.error('[Courses API] Error loading courses:', error)
    console.error('[Courses API] Error stack:', error?.stack)
    // Return empty array with 200 status to prevent page crashes
    // The page will handle empty courses gracefully
    // Return false for banner enabled to ensure it doesn't show on error
    return NextResponse.json({ 
      courses: [],
      coursesDiscountBannerEnabled: false,
      coursesDiscountBannerCourseId: undefined,
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }
}

