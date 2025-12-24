import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { type CoursePurchase, type CourseCatalog } from '@/types/course'
import { getClientUserId } from '@/lib/client-auth'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const email = searchParams.get('email')

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Load course
    const catalog = await readDataFile<CourseCatalog>('courses.json', { courses: [], discounts: [] })
    const course = catalog.courses.find(c => c.id === courseId && c.isActive)

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // If course is free, grant access immediately (no email or purchase required)
    const coursePrice = Number(course.priceUSD) || 0
    if (coursePrice === 0) {
      return NextResponse.json({
        hasAccess: true,
        isFree: true,
        priceUSD: 0,
      })
    }

    // Try to get userId from session (if user is logged in)
    let userId: string | null = null
    try {
      userId = await getClientUserId()
    } catch (error) {
      // Not logged in - that's okay
    }

    // If not logged in and no email provided, require payment
    if (!userId && !email) {
      return NextResponse.json({
        hasAccess: false,
        requiresPayment: true,
        priceUSD: coursePrice,
      })
    }

    // Check if user has purchased this course
    const purchases = await readDataFile<{ purchases: CoursePurchase[] }>('course-purchases.json', { purchases: [] })
    const normalizedEmail = email?.toLowerCase().trim() || ''
    
    // Find purchase by userId (preferred) or email (fallback)
    const purchase = purchases.purchases.find(
      p => p.courseId === courseId && 
           ((userId && p.userId === userId) || (normalizedEmail && p.email === normalizedEmail)) &&
           p.paymentStatus === 'completed' &&
           p.accessGranted === true
    )

    return NextResponse.json({
      hasAccess: !!purchase,
      isFree: coursePrice === 0,
      requiresPayment: !purchase && coursePrice > 0,
      priceUSD: coursePrice,
    })
  } catch (error) {
    console.error('Error checking course access:', error)
    return NextResponse.json({ error: 'Failed to check access' }, { status: 500 })
  }
}

