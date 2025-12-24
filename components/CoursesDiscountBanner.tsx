'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import DiscountCountdown from './DiscountCountdown'
import { type Course } from '@/types/course'
import { getCourseSlug } from '@/lib/courses-utils'

export default function CoursesDiscountBanner() {
  const pathname = usePathname()
  const [courses, setCourses] = useState<Course[]>([])
  const [activeDiscountCourse, setActiveDiscountCourse] = useState<Course | null>(null)
  const [bannerEnabled, setBannerEnabled] = useState(false) // Start as false, only enable if API says so

  // Only show on Labs and Courses pages
  const allowedPaths = ['/courses', '/labs']
  const shouldShow = allowedPaths.some(path => pathname?.startsWith(path))

  useEffect(() => {
    const loadCourses = async () => {
      try {
        // Add cache-busting timestamp to ensure fresh data
        const response = await fetch(`/api/courses?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        if (!response.ok) {
          setBannerEnabled(false)
          setActiveDiscountCourse(null)
          return
        }
        
        const data = await response.json()
        const coursesList: Course[] = data.courses || []
        
        // Check if banner is enabled - ONLY enable if explicitly set to true
        // If false, undefined, or null, disable the banner
        if (data.coursesDiscountBannerEnabled !== true) {
          setBannerEnabled(false)
          setActiveDiscountCourse(null)
          return
        }
        
        // Banner is explicitly enabled (coursesDiscountBannerEnabled === true)
        // Only proceed if there's a course with an active discount
        setBannerEnabled(true)
        
        // Find course to show in banner
        let courseWithDiscount: Course | undefined
        
        // If a specific course is selected for the banner, use that
        if (data.coursesDiscountBannerCourseId) {
          courseWithDiscount = coursesList.find(course => 
            course.id === data.coursesDiscountBannerCourseId &&
            course.discountExpiryDate && 
            new Date(course.discountExpiryDate) > new Date() &&
            course.priceUSD > 0 &&
            course.isActive
          )
        }
        
        // If no specific course selected or selected course not found, find first course with active discount
        if (!courseWithDiscount) {
          courseWithDiscount = coursesList.find(course => 
            course.discountExpiryDate && 
            new Date(course.discountExpiryDate) > new Date() &&
            course.priceUSD > 0 &&
            course.isActive
          )
        }
        
        if (courseWithDiscount) {
          setActiveDiscountCourse(courseWithDiscount)
        } else {
          setActiveDiscountCourse(null)
        }
      } catch (error) {
        console.error('Error loading courses for banner:', error)
        setBannerEnabled(false)
        setActiveDiscountCourse(null)
      }
    }

    if (shouldShow) {
      loadCourses()
    } else {
      // Clear state if not on allowed pages
      setBannerEnabled(false)
      setActiveDiscountCourse(null)
    }
  }, [shouldShow])

  // Don't show if not on allowed pages, banner disabled, or no active discount
  if (!shouldShow || !bannerEnabled || !activeDiscountCourse) return null

  const courseSlug = getCourseSlug(activeDiscountCourse)
  const discount = activeDiscountCourse.originalPriceUSD && activeDiscountCourse.priceUSD
    ? Math.round(((activeDiscountCourse.originalPriceUSD - activeDiscountCourse.priceUSD) / activeDiscountCourse.originalPriceUSD) * 100)
    : activeDiscountCourse.discountPercent || 0

  return (
    <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 border-b border-red-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-0.5">
              <span className="text-lg">🔥</span>
              <h3 className="text-sm font-bold text-red-800">
                Limited Time Offer!
              </h3>
            </div>
            <p className="text-xs text-gray-700 mb-1">
              <Link 
                href={`/course/${courseSlug}`}
                className="font-semibold text-red-700 hover:text-red-800 underline"
              >
                {activeDiscountCourse.title}
              </Link>
              {' '}is now <span className="font-bold text-red-600">{discount}% off</span>!
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-1">
              <DiscountCountdown 
                expiryDate={activeDiscountCourse.discountExpiryDate!}
                showLabel={true}
                className="text-xs"
              />
            </div>
          </div>
          <Link
            href={`/course/${courseSlug}`}
            className="bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap shadow-sm"
            style={{ color: '#ffffff', backgroundColor: '#dc2626' }}
          >
            View Course →
          </Link>
        </div>
      </div>
    </div>
  )
}

