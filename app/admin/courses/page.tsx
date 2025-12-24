'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import AdminBackButton from '@/components/AdminBackButton'
import { type Course, type CourseDiscount, type CourseCatalog } from '@/types/course'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '@/lib/currency-utils'
import { generateCourseId, generateCourseSlug } from '@/lib/courses-utils'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const blankCourse = (): Course => ({
  id: generateCourseId('course'),
  title: '',
  description: '',
  priceUSD: 0, // 0 = free, any other value = paid in USD
  originalPriceUSD: undefined,
  imageUrl: undefined,
  duration: undefined,
  level: 'all',
  category: undefined,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export default function AdminCourses() {
  const { currency, formatCurrency } = useCurrency()
  const [catalog, setCatalog] = useState<CourseCatalog>({ courses: [], discounts: [] })
  const [originalCatalog, setOriginalCatalog] = useState<CourseCatalog>({ courses: [], discounts: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null)
  const [selectedCourseForDiscount, setSelectedCourseForDiscount] = useState<string | null>(null)
  const router = useRouter()

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(catalog) !== JSON.stringify(originalCatalog),
    [catalog, originalCatalog],
  )

  // Helper function to get display price (always USD)
  const getDisplayPrice = (course: Course): number => {
    return course.priceUSD || 0
  }

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const checkAuth = async () => {
      try {
        const response = await authorizedFetch('/api/admin/current-user', {
          signal: abortController.signal,
        })
        if (!isMounted) return
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        loadCourses(abortController.signal)
      } catch (error) {
        if (!isMounted) return
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        router.replace('/admin/login')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
      try {
        abortController.abort('Component unmounted')
      } catch (error) {
        // Ignore abort errors during cleanup
      }
    }
  }, [router])

  const loadCourses = async (signal?: AbortSignal) => {
    try {
      const fetchOptions: RequestInit = {}
      if (signal) {
        fetchOptions.signal = signal
      }
      const response = await authorizedFetch('/api/admin/courses', fetchOptions)
      if (signal?.aborted) return
      if (!response.ok) {
        throw new Error('Failed to load courses')
      }
      const data: CourseCatalog = await response.json()
      if (signal?.aborted) return
      
      // Debug: Log received courses
      console.log('[Admin Courses Page] Received courses:', data.courses?.length || 0)
      console.log('[Admin Courses Page] Course titles:', data.courses?.map(c => c.title) || [])
      
      // Check if the main booking website course exists, if not, add it
      const bookingCourseExists = data.courses.some(c => 
        c.title.toLowerCase().includes('build a client-booking website') ||
        c.title.toLowerCase().includes('booking website')
      )
      
      if (!bookingCourseExists && data.courses.length === 0) {
        // Add the default booking website course
        const defaultCourse: Course = {
          id: generateCourseId('course'),
          title: 'How to Build a Client-Booking Website That Accepts Payments (Without a Developer)',
          description: 'A complete step-by-step text-based course that teaches you how to build a professional booking website from scratch. No coding experience required!',
          priceUSD: 0, // 0 = free, set to desired USD amount for paid courses
          originalPriceUSD: undefined,
          imageUrl: undefined,
          duration: '25-35 hours',
          level: 'all',
          category: 'Web Development',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        data.courses.push(defaultCourse)
        // Save it immediately
        try {
          await authorizedFetch('/api/admin/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
        } catch (error) {
          console.error('Error saving default course:', error)
        }
      }
      
      setCatalog(data)
      setOriginalCatalog(data)
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        return
      }
      console.error('Error loading courses:', error)
      if (!signal?.aborted) {
        setMessage({ type: 'error', text: 'Failed to load courses' })
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catalog),
      })

      if (!response.ok) {
        throw new Error('Failed to save courses')
      }

      setOriginalCatalog(catalog)
      setMessage({ type: 'success', text: 'Courses updated successfully! Changes are now live on the courses page.' })
      setEditingCourseId(null)
      setShowAddForm(false)
      
      // Reload courses from server to ensure we have the latest data
      // This ensures any server-side normalization is reflected
      await loadCourses()
    } catch (error) {
      console.error('Error saving courses:', error)
      setMessage({ type: 'error', text: 'Failed to save courses' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (courseId: string) => {
    const course = catalog.courses.find(c => c.id === courseId)
    if (!course) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${course.title}"? This will also delete all associated discounts. This action cannot be undone.`
    )
    if (!confirmed) return

    try {
      const response = await authorizedFetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete course')
      }

      // Remove from local state
      setCatalog({
        courses: catalog.courses.filter(c => c.id !== courseId),
        discounts: catalog.discounts.filter(d => d.courseId !== courseId),
      })
      setMessage({ type: 'success', text: 'Course deleted successfully!' })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Error deleting course:', error)
      setMessage({ type: 'error', text: 'Failed to delete course' })
    }
  }

  const updateCourse = (courseId: string, updates: Partial<Course>) => {
    setCatalog(prev => ({
      ...prev,
      courses: prev.courses.map(course => {
        if (course.id === courseId) {
          const updatedCourse = { ...course, ...updates, updatedAt: new Date().toISOString() }
          // If title changed, automatically update the slug to match
          if (updates.title && updates.title !== course.title) {
            updatedCourse.slug = generateCourseSlug(updates.title)
          }
          return updatedCourse
        }
        return course
      }),
    }))
  }

  const addCourse = () => {
    const newCourse = blankCourse()
    setCatalog(prev => ({
      ...prev,
      courses: [...prev.courses, newCourse],
    }))
    setEditingCourseId(newCourse.id)
    setShowAddForm(true)
  }

  const handleImageUpload = async (courseId: string, file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await authorizedFetch('/api/admin/gallery/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image')
      }

      updateCourse(courseId, { imageUrl: data.url })
      setMessage({ type: 'success', text: 'Image uploaded successfully!' })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Error uploading image:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload image',
      })
    }
  }

  const addDiscount = (courseId: string) => {
    const newDiscount: CourseDiscount = {
      id: generateCourseId('discount'),
      courseId,
      type: 'percentage',
      value: 10,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    setCatalog(prev => ({
      ...prev,
      discounts: [...prev.discounts, newDiscount],
    }))
    setEditingDiscountId(newDiscount.id)
    setSelectedCourseForDiscount(courseId)
  }

  const updateDiscount = (discountId: string, updates: Partial<CourseDiscount>) => {
    setCatalog(prev => ({
      ...prev,
      discounts: prev.discounts.map(discount =>
        discount.id === discountId
          ? { ...discount, ...updates }
          : discount
      ),
    }))
  }

  const removeDiscount = (discountId: string) => {
    const discount = catalog.discounts.find(d => d.id === discountId)
    if (!discount) return

    const confirmed = window.confirm(
      `Are you sure you want to delete this discount? This action cannot be undone.`
    )
    if (!confirmed) return

    setCatalog(prev => ({
      ...prev,
      discounts: prev.discounts.filter(d => d.id !== discountId),
    }))
  }

  const getCourseDiscounts = (courseId: string) => {
    return catalog.discounts.filter(d => d.courseId === courseId)
  }

  const getActiveDiscount = (courseId: string): CourseDiscount | null => {
    const now = new Date()
    return catalog.discounts.find(d => {
      if (d.courseId !== courseId || !d.isActive) return false
      if (d.startDate && new Date(d.startDate) > now) return false
      if (d.endDate && new Date(d.endDate) < now) return false
      return true
    }) || null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading courses...</div>
      </div>
    )
  }

  const editingCourse = editingCourseId
    ? catalog.courses.find(c => c.id === editingCourseId)
    : null

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <AdminBackButton />
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
          {hasUnsavedChanges && (
            <div className="text-sm text-orange-600 font-medium flex items-center gap-2">
              <span role="img" aria-label="warning">
                ⚠️
              </span>
              You have unsaved changes
            </div>
          )}
          <Link
            href="/admin/dashboard"
            className="text-brown hover:text-brown-dark"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={addCourse}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              + Add Course
            </button>
          </div>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        {/* Banner Settings */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-bold text-brown-dark mb-4">Courses Discount Banner Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 mb-1">
                  Show discount banner on Courses and Labs pages
                </p>
                <p className="text-xs text-gray-500">
                  When enabled, the banner will display on /courses and /labs pages
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={catalog.coursesDiscountBannerEnabled === true}
                  onChange={(e) => {
                    setCatalog(prev => ({
                      ...prev,
                      coursesDiscountBannerEnabled: e.target.checked ? true : false
                    }))
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brown/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brown-dark"></div>
              </label>
            </div>

            {catalog.coursesDiscountBannerEnabled === true && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Course for Banner
                </label>
                <select
                  value={catalog.coursesDiscountBannerCourseId || ''}
                  onChange={(e) => {
                    setCatalog(prev => ({
                      ...prev,
                      coursesDiscountBannerCourseId: e.target.value || undefined
                    }))
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown focus:border-brown"
                >
                  <option value="">Auto-select (first course with active discount)</option>
                  {catalog.courses.filter(c => c.isActive).map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose which course to feature in the banner. Leave as "Auto-select" to show the first course with an active discount.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-display text-brown-dark mb-6">Manage Courses</h1>

          {catalog.courses.length === 0 && !showAddForm ? (
            <div className="border border-dashed border-brown-light rounded-2xl p-8 text-center text-gray-500">
              <p className="mb-4">No courses yet.</p>
              <button
                onClick={addCourse}
                className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors"
              >
                Create Your First Course
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {catalog.courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-pink-light/30 border border-brown-light rounded-xl p-6 space-y-4"
                >
                  {editingCourseId === course.id ? (
                    <CourseEditForm
                      course={course}
                      currency={currency as 'KES' | 'USD'}
                      formatCurrency={formatCurrency}
                      getDisplayPrice={getDisplayPrice}
                      onUpdate={(updates) => updateCourse(course.id, updates)}
                      onCancel={() => {
                        setEditingCourseId(null)
                        setShowAddForm(false)
                        // Reload to reset changes
                        loadCourses()
                      }}
                      onImageUpload={(file) => handleImageUpload(course.id, file)}
                    />
                  ) : (
                    <>
                      <CourseDisplay
                        course={course}
                        currency={currency as 'KES' | 'USD'}
                        formatCurrency={formatCurrency}
                        getDisplayPrice={getDisplayPrice}
                        activeDiscount={getActiveDiscount(course.id)}
                        onEdit={() => {
                          setEditingCourseId(course.id)
                          setShowAddForm(false)
                        }}
                        onDelete={() => handleDelete(course.id)}
                      />
                      <DiscountsSection
                        courseId={course.id}
                        courseTitle={course.title}
                        discounts={getCourseDiscounts(course.id)}
                        editingDiscountId={editingDiscountId}
                        selectedCourseForDiscount={selectedCourseForDiscount}
                        onAddDiscount={() => addDiscount(course.id)}
                        onUpdateDiscount={updateDiscount}
                        onRemoveDiscount={removeDiscount}
                        onEditDiscount={(discountId) => {
                          setEditingDiscountId(discountId)
                          setSelectedCourseForDiscount(course.id)
                        }}
                        onCancelEdit={() => {
                          setEditingDiscountId(null)
                          setSelectedCourseForDiscount(null)
                        }}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CourseDisplay({
  course,
  currency,
  formatCurrency,
  getDisplayPrice,
  activeDiscount,
  onEdit,
  onDelete,
}: {
  course: Course
  currency: 'KES' | 'USD'
  formatCurrency: (amount: number) => string
  getDisplayPrice: (course: Course) => number
  activeDiscount: CourseDiscount | null
  onEdit: () => void
  onDelete: () => void
}) {
  const basePrice = course.priceUSD || 0
  const discountedPrice = activeDiscount
    ? activeDiscount.type === 'percentage'
      ? basePrice * (1 - activeDiscount.value / 100)
      : Math.max(0, basePrice - activeDiscount.value)
    : basePrice

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-brown-dark">{course.title}</h2>
            {!course.isActive && (
              <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-sm">Inactive</span>
            )}
            {activeDiscount && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold">
                {activeDiscount.type === 'percentage' 
                  ? `${activeDiscount.value}% OFF` 
                  : `${formatCurrency(activeDiscount.value)} OFF`}
              </span>
            )}
          </div>
          {course.description && (
            <p className="text-brown mb-3">{course.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-brown-dark">
            {activeDiscount ? (
              <>
                <span className="line-through text-gray-400">
                  ${basePrice.toFixed(2)} USD
                </span>
                <span className="font-semibold text-green-600">
                  ${discountedPrice.toFixed(2)} USD
                </span>
              </>
            ) : (
              <span className="font-semibold">
                {basePrice === 0 ? 'Free' : `$${basePrice.toFixed(2)} USD`}
              </span>
            )}
            {course.duration && <span>Duration: {course.duration}</span>}
            {course.level && course.level !== 'all' && (
              <span className="capitalize">Level: {course.level}</span>
            )}
            {course.category && <span>Category: {course.category}</span>}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition"
          >
            Delete
          </button>
        </div>
      </div>
      {course.imageUrl && (
        <img
          src={course.imageUrl}
          alt={course.title}
          className="w-full h-64 object-cover rounded-lg border-2 border-brown-light mt-4"
        />
      )}
    </>
  )
}

function CourseEditForm({
  course,
  currency,
  formatCurrency,
  getDisplayPrice,
  onUpdate,
  onCancel,
  onImageUpload,
}: {
  course: Course
  currency: 'KES' | 'USD'
  formatCurrency: (amount: number) => string
  getDisplayPrice: (course: Course) => number
  onUpdate: (updates: Partial<Course>) => void
  onCancel: () => void
  onImageUpload: (file: File) => void
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  return (
    <div className="space-y-4">
      {/* Course Structure Management Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Course Structure & Lessons</h3>
            <p className="text-sm text-blue-700">Manage modules, lessons, and course content structure</p>
          </div>
          <Link
            href={`/admin/courses/${course.id}/structure`}
            className="px-4 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Manage Structure →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-brown-dark mb-2">
            Course Title *
          </label>
          <input
            type="text"
            value={course.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
            placeholder="Enter course title"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-brown-dark mb-2">
            Subtitle / Tagline
          </label>
          <input
            type="text"
            value={course.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value || undefined })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
            placeholder="Short tagline shown on course listing"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-2">
            Category
          </label>
          <input
            type="text"
            value={course.category || ''}
            onChange={(e) => onUpdate({ category: e.target.value || undefined })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
            placeholder="e.g., Web Development"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-2">
            Level
          </label>
          <select
            value={course.level || 'all'}
            onChange={(e) => onUpdate({ level: e.target.value as Course['level'] })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-2">
            Current Price (USD) * <span className="text-xs font-normal text-brown-dark/60">(0 = Free)</span>
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={course.priceUSD ?? 0}
            onChange={(e) => onUpdate({ priceUSD: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
            placeholder="Enter price in USD"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-2">
            Original Price (USD)
            <span className="text-xs font-normal text-brown-dark/60 ml-2">(for discount display)</span>
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={course.originalPriceUSD ?? ''}
            onChange={(e) => onUpdate({ originalPriceUSD: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
            placeholder="Original price before discount"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-2">
            Duration
          </label>
          <input
            type="text"
            value={course.duration || ''}
            onChange={(e) => onUpdate({ duration: e.target.value || undefined })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
            placeholder="e.g., 40-50 hours"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-2">
            Number of Lessons
          </label>
          <input
            type="number"
            min={0}
            value={course.lectures ?? ''}
            onChange={(e) => onUpdate({ lectures: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
            placeholder="e.g., 123"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-2">
            Last Updated
          </label>
          <input
            type="text"
            value={course.lastUpdated || ''}
            onChange={(e) => onUpdate({ lastUpdated: e.target.value || undefined })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
            placeholder="e.g., 01/2025"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-brown-dark mb-2">
          Description
          <span className="text-xs text-gray-500 ml-2 font-normal">(Supports Markdown formatting)</span>
        </label>
        <textarea
          value={course.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value || undefined })}
          placeholder="Describe what students will learn in this course...&#10;&#10;You can use Markdown:&#10;**Bold text**&#10;*Italic text*&#10;- Bullet points&#10;1. Numbered lists"
          rows={6}
          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark font-mono text-sm"
        />
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p className="font-semibold mb-1">Markdown Formatting Guide:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><code className="bg-gray-200 px-1 rounded">**text**</code> for <strong>bold</strong></li>
            <li><code className="bg-gray-200 px-1 rounded">*text*</code> for <em>italic</em></li>
            <li><code className="bg-gray-200 px-1 rounded">- item</code> for bullet points</li>
            <li><code className="bg-gray-200 px-1 rounded">1. item</code> for numbered lists</li>
            <li><code className="bg-gray-200 px-1 rounded">## Heading</code> for headings</li>
            <li><code className="bg-gray-200 px-1 rounded">[link](url)</code> for links</li>
          </ul>
        </div>
      </div>

      {/* Instructor Information */}
      <div className="border-t border-brown-light/40 pt-4">
        <h3 className="text-lg font-semibold text-brown-dark mb-4">Instructor Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-brown-dark mb-2">
              Instructor Name
            </label>
            <input
              type="text"
              value={course.instructor?.name || ''}
              onChange={(e) => {
                const name = e.target.value || ''
                const title = course.instructor?.title || ''
                // Keep instructor object if either name or title exists
                if (name || title) {
                  onUpdate({ 
                    instructor: {
                      name,
                      title: title || undefined,
                      imageUrl: course.instructor?.imageUrl
                    }
                  })
                } else {
                  // Remove instructor if both are empty
                  onUpdate({ instructor: undefined })
                }
              }}
              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              placeholder="e.g., Catherine Kuria"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown-dark mb-2">
              Instructor Title
            </label>
            <input
              type="text"
              value={course.instructor?.title || ''}
              onChange={(e) => {
                const title = e.target.value || undefined
                const name = course.instructor?.name || ''
                // Keep instructor object if either name or title exists
                if (name || title) {
                  onUpdate({ 
                    instructor: { 
                      name,
                      title,
                      imageUrl: course.instructor?.imageUrl
                    } 
                  })
                } else {
                  // Remove instructor if both are empty
                  onUpdate({ instructor: undefined })
                }
              }}
              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              placeholder="e.g., Founder & Lead Instructor"
            />
          </div>
        </div>
      </div>


      {/* What You'll Build */}
      <div className="border-t border-brown-light/40 pt-4">
        <h3 className="text-lg font-semibold text-brown-dark mb-4">What You'll Build</h3>
        <div className="space-y-2">
          {(course.whatYoullLearn || []).map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const updated = [...(course.whatYoullLearn || [])]
                  updated[index] = e.target.value
                  onUpdate({ whatYoullLearn: updated })
                }}
                className="flex-1 px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                placeholder="What you'll build"
              />
              <button
                type="button"
                onClick={() => {
                  const updated = [...(course.whatYoullLearn || [])]
                  updated.splice(index, 1)
                  onUpdate({ whatYoullLearn: updated.length > 0 ? updated : undefined })
                }}
                className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const updated = [...(course.whatYoullLearn || []), '']
              onUpdate({ whatYoullLearn: updated })
            }}
            className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
          >
            + Add Learning Outcome
          </button>
        </div>
      </div>

      {/* Languages */}
      <div className="border-t border-brown-light/40 pt-4">
        <h3 className="text-lg font-semibold text-brown-dark mb-4">Languages</h3>
        <div className="space-y-2">
          {(course.languages || []).map((lang, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={lang}
                onChange={(e) => {
                  const updated = [...(course.languages || [])]
                  updated[index] = e.target.value
                  onUpdate({ languages: updated })
                }}
                className="flex-1 px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                placeholder="Language name"
              />
              <button
                type="button"
                onClick={() => {
                  const updated = [...(course.languages || [])]
                  updated.splice(index, 1)
                  onUpdate({ languages: updated.length > 0 ? updated : undefined })
                }}
                className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const updated = [...(course.languages || []), '']
              onUpdate({ languages: updated })
            }}
            className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
          >
            + Add Language
          </button>
        </div>
      </div>

      {/* Discount */}
      <div className="border-t border-brown-light/40 pt-4">
        <h3 className="text-lg font-semibold text-brown-dark mb-4">Discount</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-brown-dark mb-2">
              Discount Percentage
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={course.discountPercent ?? ''}
              onChange={(e) => onUpdate({ discountPercent: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              placeholder="e.g., 10"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown-dark mb-2">
              Discount Expiry Message
            </label>
            <input
              type="text"
              value={course.discountExpiry || ''}
              onChange={(e) => onUpdate({ discountExpiry: e.target.value || undefined })}
              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              placeholder="e.g., 8 hours left at this price!"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown-dark mb-2">
              Discount Expiry Date
            </label>
            <input
              type="datetime-local"
              value={course.discountExpiryDate ? new Date(course.discountExpiryDate).toISOString().slice(0, 16) : ''}
              onChange={(e) => onUpdate({ discountExpiryDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
            />
          </div>
        </div>
      </div>

      {/* Flags */}
      <div className="border-t border-brown-light/40 pt-4">
        <h3 className="text-lg font-semibold text-brown-dark mb-4">Course Flags</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={course.bestseller || false}
              onChange={(e) => onUpdate({ bestseller: e.target.checked || undefined })}
              className="w-4 h-4"
            />
            <label className="text-sm font-semibold text-brown-dark">
              Bestseller Badge
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={course.premium || false}
              onChange={(e) => onUpdate({ premium: e.target.checked || undefined })}
              className="w-4 h-4"
            />
            <label className="text-sm font-semibold text-brown-dark">
              Premium Course Badge
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={course.isActive}
              onChange={(e) => onUpdate({ isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm font-semibold text-brown-dark">
              Course is active (visible to customers)
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-brown-dark mb-2">
          Course Image
        </label>
        {course.imageUrl ? (
          <div className="space-y-2">
            <img
              src={course.imageUrl}
              alt={course.title}
              className="w-full h-48 object-cover rounded-lg border-2 border-brown-light"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={course.imageUrl}
                onChange={(e) => onUpdate({ imageUrl: e.target.value || undefined })}
                placeholder="Image URL"
                className="flex-1 px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
              <button
                type="button"
                onClick={() => onUpdate({ imageUrl: undefined })}
                className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImageUpload(file)
              }}
              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
            />
            <p className="text-xs text-brown-dark/60">
              Upload an image for this course. Max size: 5MB. Supported formats: JPEG, PNG, WebP, GIF.
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={course.isActive}
          onChange={(e) => onUpdate({ isActive: e.target.checked })}
          className="w-4 h-4"
        />
        <label className="text-sm font-semibold text-brown-dark">
          Course is active (visible to customers)
        </label>
      </div>
      <div className="flex gap-2 pt-4 border-t border-brown-light/40">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function DiscountsSection({
  courseId,
  courseTitle,
  discounts,
  editingDiscountId,
  selectedCourseForDiscount,
  onAddDiscount,
  onUpdateDiscount,
  onRemoveDiscount,
  onEditDiscount,
  onCancelEdit,
}: {
  courseId: string
  courseTitle: string
  discounts: CourseDiscount[]
  editingDiscountId: string | null
  selectedCourseForDiscount: string | null
  onAddDiscount: () => void
  onUpdateDiscount: (discountId: string, updates: Partial<CourseDiscount>) => void
  onRemoveDiscount: (discountId: string) => void
  onEditDiscount: (discountId: string) => void
  onCancelEdit: () => void
}) {
  return (
    <div className="border-t border-brown-light/40 pt-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-brown-dark">Discounts</h3>
        <button
          onClick={onAddDiscount}
          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          + Add Discount
        </button>
      </div>

      {discounts.length === 0 ? (
        <p className="text-sm text-brown-dark/60">No discounts for this course yet.</p>
      ) : (
        <div className="space-y-3">
          {discounts.map((discount) => (
            <div
              key={discount.id}
              className="bg-white border border-brown-light rounded-lg p-4"
            >
              {editingDiscountId === discount.id ? (
                <DiscountEditForm
                  discount={discount}
                  onUpdate={(updates) => onUpdateDiscount(discount.id, updates)}
                  onCancel={onCancelEdit}
                  onDelete={() => {
                    onRemoveDiscount(discount.id)
                    onCancelEdit()
                  }}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-brown-dark">
                        {discount.type === 'percentage' 
                          ? `${discount.value}% OFF` 
                          : `$${discount.value} OFF`}
                      </span>
                      {!discount.isActive && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">Inactive</span>
                      )}
                    </div>
                    <div className="text-xs text-brown-dark/60">
                      {discount.startDate && discount.endDate ? (
                        <span>
                          {new Date(discount.startDate).toLocaleDateString()} - {new Date(discount.endDate).toLocaleDateString()}
                        </span>
                      ) : discount.startDate ? (
                        <span>Starts: {new Date(discount.startDate).toLocaleDateString()}</span>
                      ) : discount.endDate ? (
                        <span>Ends: {new Date(discount.endDate).toLocaleDateString()}</span>
                      ) : (
                        <span>No date restrictions</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => onEditDiscount(discount.id)}
                      className="px-3 py-1.5 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onRemoveDiscount(discount.id)}
                      className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DiscountEditForm({
  discount,
  onUpdate,
  onCancel,
  onDelete,
}: {
  discount: CourseDiscount
  onUpdate: (updates: Partial<CourseDiscount>) => void
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-1">
            Discount Type
          </label>
          <select
            value={discount.type}
            onChange={(e) => onUpdate({ type: e.target.value as 'percentage' | 'fixed' })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-1">
            Discount Value {discount.type === 'percentage' ? '(%)' : '(Amount)'}
          </label>
          <input
            type="number"
            min={0}
            max={discount.type === 'percentage' ? 100 : undefined}
            step={discount.type === 'percentage' ? 1 : 0.01}
            value={discount.value}
            onChange={(e) => onUpdate({ value: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-1">
            Start Date (Optional)
          </label>
          <input
            type="date"
            value={discount.startDate ? discount.startDate.split('T')[0] : ''}
            onChange={(e) => onUpdate({ startDate: e.target.value || undefined })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-brown-dark mb-1">
            End Date (Optional)
          </label>
          <input
            type="date"
            value={discount.endDate ? discount.endDate.split('T')[0] : ''}
            onChange={(e) => onUpdate({ endDate: e.target.value || undefined })}
            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={discount.isActive}
          onChange={(e) => onUpdate({ isActive: e.target.checked })}
          className="w-4 h-4"
        />
        <label className="text-sm font-semibold text-brown-dark">
          Discount is active
        </label>
      </div>
      <div className="flex gap-2 pt-2 border-t border-brown-light/40">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

