'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { type Course } from '@/types/course'
import { useRouter } from 'next/navigation'
import CourseCompletionBanner from '@/components/CourseCompletionBanner'
import DiscountCountdown from '@/components/DiscountCountdown'
import { getCourseSlug } from '@/lib/courses-utils'
import { marked } from 'marked'

// Configure marked for markdown rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

export default function CourseDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [discountApplied, setDiscountApplied] = useState(false)
  const [startingCourse, setStartingCourse] = useState(false)
  const [totalLessons, setTotalLessons] = useState(0)
  const [courseModules, setCourseModules] = useState<any[]>([])
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  // Calculate total lessons and load course modules for preview
  useEffect(() => {
    const calculateTotalLessons = async () => {
      if (!course) return
      
      try {
        // Fetch course-specific structure from API
        const response = await fetch(`/api/courses/${course.id}/structure`, {
          cache: 'no-store',
        })
        
        if (response.ok) {
          const data = await response.json()
          const courseStructure = data.structure || []
          const total = courseStructure.reduce((sum: number, module: any) => sum + module.lessons.length, 0)
          setTotalLessons(total)
          setCourseModules(courseStructure)
        } else {
          // Fallback to default structure
          const { courseStructure } = await import('@/lib/course-structure')
          const total = courseStructure.reduce((sum, module) => sum + module.lessons.length, 0)
          setTotalLessons(total)
          setCourseModules(courseStructure)
        }
      } catch (error) {
        console.error('Error calculating total lessons:', error)
        // Fallback to default structure
        try {
          const { courseStructure } = await import('@/lib/course-structure')
          const total = courseStructure.reduce((sum, module) => sum + module.lessons.length, 0)
          setTotalLessons(total)
          setCourseModules(courseStructure)
        } catch (fallbackError) {
          setTotalLessons(50) // Final fallback estimate
        }
      }
    }
    
    if (course) {
      calculateTotalLessons()
    }
  }, [course])

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      if (isMounted && !abortController.signal.aborted) {
        abortController.abort('Request timeout')
      }
    }, 10000) // 10 second timeout

    const fetchCourse = async () => {
      try {
        const decodedSlug = decodeURIComponent(params.slug)
        const timestamp = Date.now()
        
        const response = await fetch(`/api/courses?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          credentials: 'same-origin',
          cache: 'no-store',
          signal: abortController.signal,
        })
        
        if (!isMounted) return
        
        if (!response.ok) {
          console.error('Failed to fetch courses:', response.status, response.statusText)
          if (isMounted) {
            setLoading(false)
          }
          return
        }
        
        const data = await response.json()
        const courses: Course[] = data.courses || []
        
        if (!isMounted) return
        
        // Debug logging
        console.log('[Course Detail] Fetched courses:', courses.length)
        courses.forEach(c => {
          console.log(`[Course Detail] Course: "${c.title}" (ID: ${c.id}, Image: ${c.imageUrl || 'NONE'})`)
        })
        
        // Use the static import (already imported at top)
        const courseData = courses.find(c => {
          // Use the same slug generation as server-side
          const courseSlug = getCourseSlug(c)
          const normalizedSlug = courseSlug.toLowerCase().trim()
          const normalizedDecoded = decodedSlug.toLowerCase().trim()
          return normalizedSlug === normalizedDecoded || c.id === decodedSlug || c.id.toLowerCase() === normalizedDecoded
        }) || null
        
        if (courseData) {
          console.log('[Course Detail] Found course:', courseData.title, 'Image URL:', courseData.imageUrl)
        } else {
          console.error('[Course Detail] Course not found for slug:', decodedSlug)
        }
        
        if (isMounted) {
          setCourse(courseData)
          setLoading(false)
        }
      } catch (error: any) {
        if (!isMounted) return
        
        // Ignore abort errors (timeout or cleanup)
        if (error?.name === 'AbortError') {
          // Silently handle abort - this is expected during cleanup or timeout
          if (isMounted) {
            setLoading(false)
          }
          return
        }
        
        console.error('Error loading course:', error)
        if (isMounted) {
          setLoading(false)
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }
    
    fetchCourse()
    
    return () => {
      isMounted = false
      // Only abort if not already aborted
      if (!abortController.signal.aborted) {
        try {
          abortController.abort('Component unmounted')
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [params.slug])

  const calculateDiscount = (): number => {
    if (!course) return 0
    
    // Priority 1: Use discountPercent if set (handle both string and number)
    const discountPercent = typeof course.discountPercent === 'string' 
      ? parseFloat(course.discountPercent) 
      : course.discountPercent
    if (discountPercent && discountPercent > 0 && !isNaN(discountPercent)) {
      return Math.round(discountPercent)
    }
    
    // Priority 2: Calculate from originalPriceUSD if available
    if (course.originalPriceUSD && course.originalPriceUSD > course.priceUSD) {
      const calculatedDiscount = Math.round(((course.originalPriceUSD - course.priceUSD) / course.originalPriceUSD) * 100)
      return calculatedDiscount
    }
    
    return 0
  }


  const handleStartCourse = async () => {
    if (!course) return
    
    // Get the course slug for the URL
    const courseSlug = getCourseSlug(course)
    const modulesUrl = `/course/${courseSlug}/modules`
    
    // Navigate to modules overview page
    router.push(modulesUrl)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading course...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Link href="/courses" className="text-blue-600 hover:underline">
            ← Back to Courses
          </Link>
        </div>
      </div>
    )
  }

  // Calculate discount and final price (course is guaranteed to be non-null here)
  const discount = calculateDiscount()
  const basePrice = course.priceUSD
  
  // Get original price (priceUSD is the original/base price)
  const originalPrice = course.originalPriceUSD || course.priceUSD
  
  // Calculate discounted price if discountPercent is set
  let discountedPrice = basePrice
  const discountPercentValue = typeof course.discountPercent === 'string' 
    ? parseFloat(course.discountPercent) 
    : course.discountPercent
  if (discountPercentValue && discountPercentValue > 0 && !isNaN(discountPercentValue)) {
    // Apply discount: originalPrice * (1 - discountPercent / 100)
    discountedPrice = originalPrice * (1 - discountPercentValue / 100)
    // Round to 2 decimal places
    discountedPrice = Math.round(discountedPrice * 100) / 100
  } else if (course.originalPriceUSD && course.originalPriceUSD > basePrice) {
    // If originalPriceUSD is set and higher, basePrice is already the discounted price
    discountedPrice = basePrice
  }
  
  // Final price is the discounted price
  const finalPrice = discountedPrice
  
  // Determine if we should show discount
  const hasDiscount = (discountPercentValue && discountPercentValue > 0 && !isNaN(discountPercentValue)) || 
                     (discount > 0 && originalPrice > finalPrice)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/courses" className="text-sm text-purple-600 hover:text-purple-700">
            ← Back to Courses
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Completion Banner */}
        {course && totalLessons > 0 && (
          <CourseCompletionBanner course={course} totalLessons={totalLessons} />
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Course Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {course.title}
            </h1>

            {/* Subtitle */}
            {course.subtitle && (
              <p className="text-lg text-gray-700 mb-4">
                {course.subtitle}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {course.bestseller && (
                <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded">
                  Bestseller
                </span>
              )}
            </div>

            {/* Course Metadata */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Created by Catherine Kuria</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Last updated </span>
                <span className="text-gray-600">
                  {course.lastUpdated || (course.updatedAt ? new Date(course.updatedAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  }) : 'Recently')}
                </span>
                <span className="text-xs text-green-600 ml-2 font-medium">✓ Up to date</span>
              </div>
              {course.premium && (
                <div>
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold">
                    Premium
                  </span>
                </div>
              )}
            </div>

           
            {/* What You'll Build */}
            {course.whatYoullLearn && course.whatYoullLearn.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">What you'll build</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.whatYoullLearn.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Course Preview - Modules */}
            {courseModules.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Course Curriculum</h2>
                  <span
                    onClick={() => {
                      if (expandedModules.size === courseModules.length) {
                        setExpandedModules(new Set())
                      } else {
                        setExpandedModules(new Set(courseModules.map(m => m.id)))
                      }
                    }}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium cursor-pointer"
                  >
                    {expandedModules.size === courseModules.length ? 'Collapse all sections' : 'Expand all sections'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  {courseModules.length} {courseModules.length === 1 ? 'section' : 'sections'} • {totalLessons} {totalLessons === 1 ? 'lesson' : 'lessons'}
                </div>
                <div>
                  {courseModules.map((module, index) => {
                    const isExpanded = expandedModules.has(module.id)
                    return (
                      <div
                        key={module.id}
                        className="border-b border-gray-200 last:border-b-0"
                      >
                        {/* Module Header - Clickable */}
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedModules)
                            if (isExpanded) {
                              newExpanded.delete(module.id)
                            } else {
                              newExpanded.add(module.id)
                            }
                            setExpandedModules(newExpanded)
                          }}
                          className="w-full px-4 py-3 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <svg
                              className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <h3 className="text-sm font-medium text-gray-900 flex-1">
                              {module.title}
                            </h3>
                          </div>
                          <div className="flex-shrink-0 text-sm text-gray-600">
                            {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'} • {module.estimatedTime}
                          </div>
                        </button>
                        
                        {/* Lessons List - Collapsible */}
                        {isExpanded && module.lessons && module.lessons.length > 0 && (
                          <div className="px-4 pb-3 bg-white border-t border-gray-200">
                            <ul className="space-y-2 pt-2">
                              {module.lessons.map((lesson: any, lessonIndex: number) => (
                                <li key={lesson.id} className="flex items-start gap-3 text-sm text-gray-600">
                                  <span className="text-gray-400 mt-0.5 flex-shrink-0 text-xs">
                                    {lessonIndex + 1}.
                                  </span>
                                  <div className="flex-1 flex items-center justify-between">
                                    <span className="text-gray-700">{lesson.title}</span>
                                    {lesson.estimatedTime && (
                                      <span className="text-gray-400 ml-2 text-xs">{lesson.estimatedTime}</span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {course && (
                  <div className="mt-6 text-center">
                    {course.priceUSD > 0 ? (
                      <Link
                        href={`/courses/${course.id}/checkout`}
                        className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors text-lg"
                      >
                        Begin Course
                        <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ) : (
                      <Link
                        href={`/course/${getCourseSlug(course)}/modules`}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Start Learning Now
                        <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Purchase Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                {/* Course Image */}
                {course.imageUrl && (
                  <div className="relative w-full h-48 bg-gray-200 overflow-hidden">
                    <img
                      key={course.imageUrl}
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      onLoad={() => {
                        console.log('[Course Detail] Image loaded successfully:', course.imageUrl)
                      }}
                      onError={(e) => {
                        console.error('[Course Detail] Failed to load course image:', course.imageUrl)
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Pricing */}
                  <div className="mb-4">
                    {course.priceUSD === 0 ? (
                      <div className="text-3xl font-bold text-gray-900">Free</div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2 mb-2">
                          {hasDiscount && discount ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 line-through">
                                  ${originalPrice.toFixed(2)}
                                </span>
                                <span className="text-3xl font-bold text-gray-900">
                                  ${finalPrice.toFixed(2)}
                                </span>
                              </div>
                              <div className="text-sm text-green-600 font-semibold">
                                {discount}% off
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-3xl font-bold text-gray-900">
                                ${finalPrice.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                        {hasDiscount && course.discountExpiryDate && (
                          <div className="mt-2">
                            <DiscountCountdown 
                              expiryDate={course.discountExpiryDate}
                              showLabel={true}
                            />
                          </div>
                        )}
                        {hasDiscount && !course.discountExpiryDate && course.discountExpiry && (
                          <div className="text-xs text-red-600 font-semibold mt-1">
                            {course.discountExpiry}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Guarantee */}
                  <div className="mb-4 text-sm text-gray-600">
                    <div>✓ Full Lifetime Access</div>
                  </div>


                  {/* Action Buttons */}
                  {course.priceUSD === 0 ? (
                    // Free course - show "Start Course" button
                    <button 
                      onClick={handleStartCourse}
                      disabled={startingCourse}
                      className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-purple-700 transition mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {startingCourse ? 'Starting...' : 'Start Course'}
                    </button>
                  ) : (
                    // Paid course - show "Buy Now" button
                    <button 
                      onClick={() => router.push(`/courses/${course.id}/checkout`)}
                      className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-purple-700 transition mb-4"
                    >
                      Buy Now
                    </button>
                  )}

                  {/* Course Includes */}
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm text-gray-600">
                    {course.lectures && (
                      <div>✓ {course.lectures} lessons</div>
                    )}
                    {course.level && course.level !== 'all' && (
                      <div>✓ {course.level.charAt(0).toUpperCase() + course.level.slice(1)} Level</div>
                    )}
                    <div>✓ Full lifetime access</div>
                    <div>✓ Certificate of completion</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
