'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { type Course } from '@/types/course'
import { getCourseSlug } from '@/lib/courses-utils'

export default function CourseCheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = params.courseId as string
  const purchaseId = searchParams.get('purchaseId')

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const response = await fetch(`/api/courses`)
        if (!response.ok) throw new Error('Failed to load course')
        const data = await response.json()
        const foundCourse = data.courses.find((c: Course) => c.id === courseId)
        if (foundCourse) {
          setCourse(foundCourse)
        } else {
          router.push('/courses')
        }
      } catch (error) {
        console.error('Error loading course:', error)
        router.push('/courses')
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      loadCourse()
    }
  }, [courseId, router])

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!course || !email.trim()) {
      setError('Please enter your email address')
      return
    }
    if (!name.trim()) {
      setError('Please enter your full name')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/courses/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          email: email.trim(),
          name: name.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process purchase')
      }

      // Store student name and email for certificate and access
      if (name.trim()) {
        localStorage.setItem(`course_student_name_${course.id}`, name.trim())
      }
      localStorage.setItem('courseAccessEmail', email.trim())

      if (data.accessGranted) {
        // Free course - redirect immediately to first module
        router.push(data.redirectUrl)
      } else if (data.requiresPayment) {
        // Paid course - MUST redirect to Paystack payment page
        if (data.authorizationUrl) {
          // Redirect directly to Paystack (use window.location for external redirect)
          console.log('Redirecting to Paystack:', data.authorizationUrl)
          window.location.href = data.authorizationUrl
          return // Stop execution after redirect
        } else if (data.redirectUrl && (data.redirectUrl.startsWith('http://') || data.redirectUrl.startsWith('https://'))) {
          // External URL (Paystack) - use window.location
          console.log('Redirecting to Paystack (redirectUrl):', data.redirectUrl)
          window.location.href = data.redirectUrl
          return // Stop execution after redirect
        } else {
          // No Paystack URL - this should not happen
          console.error('No Paystack authorization URL received:', data)
          setError('Payment initialization failed. Please try again or contact support.')
        }
      }
    } catch (error) {
      console.error('Error processing purchase:', error)
      setError(error instanceof Error ? error.message : 'Failed to process purchase')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!course) {
    return null
  }

  // Calculate the actual price to charge (apply discount if set)
  const calculateCoursePrice = (course: Course): number => {
    const basePrice = course.priceUSD || 0
    // If discountPercent is set, apply it
    if (course.discountPercent && course.discountPercent > 0) {
      return basePrice * (1 - course.discountPercent / 100)
    }
    // If originalPriceUSD is set and higher than priceUSD, priceUSD is already discounted
    if (course.originalPriceUSD && course.originalPriceUSD > basePrice) {
      return basePrice
    }
    return basePrice
  }

  const originalPrice = course.originalPriceUSD || course.priceUSD
  const actualPrice = calculateCoursePrice(course)
  const discount = course.discountPercent || (course.originalPriceUSD && course.originalPriceUSD > course.priceUSD 
    ? Math.round(((course.originalPriceUSD - course.priceUSD) / course.originalPriceUSD) * 100)
    : null)
  const hasDiscount = discount && discount > 0 && originalPrice > actualPrice

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href={`/course/${course ? getCourseSlug(course) : courseId}`} className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to Course Details
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">Purchase Course</h1>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            {course.imageUrl ? (
              <div className="mb-4">
                <img
                  src={course.imageUrl}
                  alt={course.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              </div>
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg mb-4 flex items-center justify-center text-white text-7xl">
                📚
              </div>
            )}
            <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
            {hasDiscount ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 line-through">
                    ${originalPrice.toFixed(2)}
                  </span>
                  <span className="text-3xl font-bold text-blue-600">
                    ${actualPrice.toFixed(2)} USD
                  </span>
                </div>
                <span className="text-sm text-green-600 font-semibold">
                  {discount}% off
                </span>
              </div>
            ) : (
              <div className="text-3xl font-bold text-blue-600">
                ${actualPrice.toFixed(2)} USD
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handlePurchase} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll send your course access to this email
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your Name"
              />
            </div>

            <button
              type="submit"
              disabled={processing || !email.trim() || !name.trim()}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : `Purchase for $${actualPrice.toFixed(2)} USD`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

