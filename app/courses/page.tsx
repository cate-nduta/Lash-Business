'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { type Course } from '@/types/course'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '@/lib/currency-utils'
import { getCourseSlug } from '@/lib/courses-utils'
import CoursesDiscountBanner from '@/components/CoursesDiscountBanner'

export default function CoursesPage() {
  const { currency, formatCurrency } = useCurrency()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/courses?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        })
        if (!response.ok) {
          throw new Error('Failed to load courses')
        }
        const data = await response.json()
        console.log('[Courses Page] Received courses:', data.courses?.length || 0)
        data.courses?.forEach((c: Course) => {
          console.log(`[Courses Page] Course: "${c.title}" (Image: ${c.imageUrl || 'NONE'})`)
        })
        setCourses(data.courses || [])
      } catch (error) {
        console.error('Error loading courses:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  // Get the original price (priceUSD is the original/base price)
  const getOriginalPrice = (course: Course): number => {
    // If originalPriceUSD is explicitly set, use it
    if (course.originalPriceUSD) {
      return course.originalPriceUSD
    }
    // Otherwise, priceUSD is the original price
    return course.priceUSD || 0
  }

  // Get the discounted/display price (what customer actually pays)
  const getDisplayPrice = (course: Course): number => {
    const original = getOriginalPrice(course)
    
    // If discountPercent is set, calculate discounted price (handle both number and string)
    const discountPercent = typeof course.discountPercent === 'string' 
      ? parseFloat(course.discountPercent) 
      : course.discountPercent
    if (discountPercent && discountPercent > 0 && !isNaN(discountPercent) && original > 0) {
      const discounted = original * (1 - discountPercent / 100)
      // Round to 2 decimal places to avoid floating point issues
      return Math.round(discounted * 100) / 100
    }
    
    // If originalPriceUSD is set and different from priceUSD, use priceUSD as discounted
    if (course.originalPriceUSD && course.originalPriceUSD > course.priceUSD) {
      return course.priceUSD
    }
    
    // Otherwise, no discount - return original price
    return original
  }

  const calculateDiscount = (course: Course): number | null => {
    // If discountPercent is explicitly set, use it (handle both number and string)
    const discountPercent = typeof course.discountPercent === 'string' 
      ? parseFloat(course.discountPercent) 
      : course.discountPercent
    if (discountPercent && discountPercent > 0 && !isNaN(discountPercent)) {
      return Math.round(discountPercent)
    }
    
    // Otherwise, calculate from originalPriceUSD and priceUSD if both exist
    const original = course.originalPriceUSD
    const current = course.priceUSD
    if (original && original > current && current > 0) {
      return Math.round(((original - current) / original) * 100)
    }
    
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading courses...</div>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-center mb-8">Our Courses</h1>
          <div className="text-center text-gray-600">
            <p className="text-lg">No courses available at the moment.</p>
            <p className="mt-2">Check back soon for new courses!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Discount Banner */}
      <CoursesDiscountBanner />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold">Our Courses</h1>
          <Link
            href="/courses/login"
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            title="Student Login"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>Student Login</span>
          </Link>
        </div>
        <p className="text-center text-gray-600 mb-12">
          Explore our collection of courses designed to help you grow your business
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const discount = calculateDiscount(course)
            const originalPrice = getOriginalPrice(course)
            const currentPrice = getDisplayPrice(course)
            // Show discount if discountPercent is explicitly set OR if there's a meaningful price difference
            const discountPercentValue = typeof course.discountPercent === 'string' 
              ? parseFloat(course.discountPercent) 
              : course.discountPercent
            const hasDiscount = (discountPercentValue && discountPercentValue > 0 && !isNaN(discountPercentValue)) || 
                               (discount !== null && discount > 0 && Math.abs(originalPrice - currentPrice) > 0.01)
            
            return (
              <Link
                key={course.id}
                href={`/course/${getCourseSlug(course)}`}
                className="block bg-white rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-purple-300"
              >
                {/* Course Image */}
                {course.imageUrl && (
                  <div className="relative w-full h-40 bg-gray-200 overflow-hidden">
                    <img
                      key={course.imageUrl}
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      onLoad={() => {
                        console.log('[Courses Page] Image loaded:', course.imageUrl)
                      }}
                      onError={(e) => {
                        console.error('[Courses Page] Failed to load course image:', course.imageUrl)
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                    {course.bestseller && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                          Bestseller
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Course Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-lg font-bold text-gray-900 line-clamp-2 h-14 flex-1">
                      {course.title}
                    </h2>
                    {!course.imageUrl && course.bestseller && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded flex-shrink-0">
                        Bestseller
                      </span>
                    )}
                  </div>
                  
                  {/* Subtitle/Tagline */}
                  {course.subtitle && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">
                      {course.subtitle}
                    </p>
                  )}

                  {/* Instructor */}
                  {course.instructor?.name && (
                    <p className="text-sm text-gray-600 mb-2">
                      {course.instructor.name}
                      {course.instructor.title && `, ${course.instructor.title}`}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {course.duration && (
                      <span className="text-xs text-gray-600">{course.duration}</span>
                    )}
                    {course.lectures && (
                      <>
                        {course.duration && (
                          <span className="text-xs text-gray-600">•</span>
                        )}
                        <span className="text-xs text-gray-600">{course.lectures} lessons</span>
                      </>
                    )}
                  </div>

                  {/* Level Badge */}
                  {course.level && course.level !== 'all' && (
                    <span className="inline-block mb-3 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded capitalize">
                      {course.level}
                    </span>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      {currentPrice === 0 ? (
                        <span className="text-xl font-bold text-gray-900">Free</span>
                      ) : (
                        <>
                          {hasDiscount && discount ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 line-through">
                                  ${originalPrice.toFixed(2)}
                                </span>
                                <span className="text-xl font-bold text-gray-900">
                                  ${currentPrice.toFixed(2)}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                                {discount}% off
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-bold text-gray-900">
                              ${currentPrice.toFixed(2)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
