import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { type CourseCatalog } from '@/types/course'
import { readFileSync } from 'fs'
import path from 'path'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // CRITICAL FIX: Always read directly from local file system first
    // Supabase may have outdated data with different IDs
    // The local file has the correct data with both courses
    let catalog: CourseCatalog = { courses: [], discounts: [] }
    
    try {
      const filePath = path.join(process.cwd(), 'data', 'courses.json')
      const fileContent = readFileSync(filePath, 'utf-8')
      catalog = JSON.parse(fileContent) as CourseCatalog
      console.log(`[Courses API] ✓ Read from local file: Found ${catalog.courses.length} courses`)
      catalog.courses.forEach(c => {
        console.log(`[Courses API]   - "${c.title}" (ID: ${c.id}, Active: ${c.isActive})`)
      })
    } catch (fileError) {
      console.warn(`[Courses API] Failed to read from local file, falling back to readDataFile:`, fileError)
      // Fallback to readDataFile if local file read fails
      catalog = await readDataFile<CourseCatalog>('courses.json', { courses: [], discounts: [] })
    }
    
    // Only return active courses - handle boolean true
    let activeCourses = catalog.courses.filter(course => {
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
    const activeDiscounts = catalog.discounts.filter(discount => {
      if (!discount.isActive) return false
      
      // Check if discount is within date range
      if (discount.startDate) {
        const startDate = new Date(discount.startDate)
        if (now < startDate) return false
      }
      
      if (discount.endDate) {
        const endDate = new Date(discount.endDate)
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999)
        if (now > endDate) return false
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
    const bannerCourseId = catalog.coursesDiscountBannerCourseId
    
    return NextResponse.json({ 
      courses: activeCourses,
      coursesDiscountBannerEnabled: catalog.coursesDiscountBannerEnabled, // Return actual value, not computed
      coursesDiscountBannerCourseId: bannerCourseId
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  } catch (error) {
    console.error('Error loading courses:', error)
    // Return empty array with 200 status to prevent page crashes
    // The page will handle empty courses gracefully
    // Return false for banner enabled to ensure it doesn't show on error
    return NextResponse.json({ 
      courses: [],
      coursesDiscountBannerEnabled: false,
      coursesDiscountBannerCourseId: undefined
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

