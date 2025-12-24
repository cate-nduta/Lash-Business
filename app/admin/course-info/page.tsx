'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import AdminBackButton from '@/components/AdminBackButton'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

interface CourseInfo {
  title: string
  subtitle: string
  description: string
  overview: {
    modules: number
    hours: string
    format: string
  }
  introText: string
  perfectFor: string
  cta: {
    title: string
    subtitle: string
    buttonText: string
    buttonSubtext: string
  }
  features: Array<{
    icon: string
    title: string
    description: string
  }>
}

export default function AdminCourseInfo() {
  const [courseInfo, setCourseInfo] = useState<CourseInfo>({
    title: '',
    subtitle: '',
    description: '',
    overview: {
      modules: 10,
      hours: '25-35',
      format: '100% Text-Based (No Videos)',
    },
    introText: '',
    perfectFor: '',
    cta: {
      title: '',
      subtitle: '',
      buttonText: '',
      buttonSubtext: '',
    },
    features: [],
  })
  const [originalCourseInfo, setOriginalCourseInfo] = useState<CourseInfo>(courseInfo)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(courseInfo) !== JSON.stringify(originalCourseInfo),
    [courseInfo, originalCourseInfo],
  )

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
        loadCourseInfo(abortController.signal)
      } catch (error) {
        if (!isMounted) return
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
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

  const loadCourseInfo = async (signal?: AbortSignal) => {
    try {
      const fetchOptions: RequestInit = {}
      if (signal) {
        fetchOptions.signal = signal
      }
      const response = await authorizedFetch('/api/admin/course-info', fetchOptions)
      if (signal?.aborted) return
      if (!response.ok) {
        throw new Error('Failed to load course info')
      }
      const data: CourseInfo = await response.json()
      if (signal?.aborted) return
      setCourseInfo(data)
      setOriginalCourseInfo(data)
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        return
      }
      console.error('Error loading course info:', error)
      if (!signal?.aborted) {
        setMessage({ type: 'error', text: 'Failed to load course info' })
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
      const response = await authorizedFetch('/api/admin/course-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseInfo),
      })

      if (!response.ok) {
        throw new Error('Failed to save course info')
      }

      setOriginalCourseInfo(courseInfo)
      setMessage({ type: 'success', text: 'Course information updated successfully!' })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Error saving course info:', error)
      setMessage({ type: 'error', text: 'Failed to save course info' })
    } finally {
      setSaving(false)
    }
  }

  const addFeature = () => {
    setCourseInfo(prev => ({
      ...prev,
      features: [...prev.features, { icon: '📅', title: '', description: '' }],
    }))
  }

  const updateFeature = (index: number, field: 'icon' | 'title' | 'description', value: string) => {
    setCourseInfo(prev => ({
      ...prev,
      features: prev.features.map((feature, i) =>
        i === index ? { ...feature, [field]: value } : feature
      ),
    }))
  }

  const removeFeature = (index: number) => {
    setCourseInfo(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading course information...</div>
      </div>
    )
  }

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
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          <h1 className="text-3xl font-display text-brown-dark">Edit Course Information</h1>

          {/* Basic Information */}
          <div className="space-y-4 border-b border-brown-light/40 pb-6">
            <h2 className="text-2xl font-semibold text-brown-dark">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Course Title
              </label>
              <input
                type="text"
                value={courseInfo.title}
                onChange={(e) => setCourseInfo(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                placeholder="How to Build a Client-Booking Website"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Course Subtitle
              </label>
              <input
                type="text"
                value={courseInfo.subtitle}
                onChange={(e) => setCourseInfo(prev => ({ ...prev, subtitle: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                placeholder="That Accepts Payments (Without a Developer)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Course Description
              </label>
              <textarea
                value={courseInfo.description}
                onChange={(e) => setCourseInfo(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                placeholder="A complete step-by-step text-based course that teaches you how to build a professional booking website from scratch. No coding experience required!"
              />
            </div>
          </div>

          {/* Overview Stats */}
          <div className="space-y-4 border-b border-brown-light/40 pb-6">
            <h2 className="text-2xl font-semibold text-brown-dark">Overview Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Number of Modules
                </label>
                <input
                  type="number"
                  min={0}
                  value={courseInfo.overview.modules}
                  onChange={(e) => setCourseInfo(prev => ({
                    ...prev,
                    overview: { ...prev.overview, modules: Number(e.target.value) || 0 },
                  }))}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Hours of Content
                </label>
                <input
                  type="text"
                  value={courseInfo.overview.hours}
                  onChange={(e) => setCourseInfo(prev => ({
                    ...prev,
                    overview: { ...prev.overview, hours: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="25-35"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Format
                </label>
                <input
                  type="text"
                  value={courseInfo.overview.format}
                  onChange={(e) => setCourseInfo(prev => ({
                    ...prev,
                    overview: { ...prev.overview, format: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="100% Text-Based (No Videos)"
                />
              </div>
            </div>
          </div>

          {/* Introduction Text */}
          <div className="space-y-4 border-b border-brown-light/40 pb-6">
            <h2 className="text-2xl font-semibold text-brown-dark">Introduction Text</h2>
            
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Course Introduction
              </label>
              <textarea
                value={courseInfo.introText}
                onChange={(e) => setCourseInfo(prev => ({ ...prev, introText: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                placeholder="This course will teach you how to build a complete booking website..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Perfect For
              </label>
              <input
                type="text"
                value={courseInfo.perfectFor}
                onChange={(e) => setCourseInfo(prev => ({ ...prev, perfectFor: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                placeholder="Business owners, service providers, entrepreneurs..."
              />
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-4 border-b border-brown-light/40 pb-6">
            <h2 className="text-2xl font-semibold text-brown-dark">Call to Action Section</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  CTA Title
                </label>
                <input
                  type="text"
                  value={courseInfo.cta.title}
                  onChange={(e) => setCourseInfo(prev => ({
                    ...prev,
                    cta: { ...prev.cta, title: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="Ready to Start Learning?"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  CTA Subtitle
                </label>
                <input
                  type="text"
                  value={courseInfo.cta.subtitle}
                  onChange={(e) => setCourseInfo(prev => ({
                    ...prev,
                    cta: { ...prev.cta, subtitle: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="Begin with Module 1 and follow along step-by-step"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Button Text
                </label>
                <input
                  type="text"
                  value={courseInfo.cta.buttonText}
                  onChange={(e) => setCourseInfo(prev => ({
                    ...prev,
                    cta: { ...prev.cta, buttonText: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="Start Course Now"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Button Subtext
                </label>
                <input
                  type="text"
                  value={courseInfo.cta.buttonSubtext}
                  onChange={(e) => setCourseInfo(prev => ({
                    ...prev,
                    cta: { ...prev.cta, buttonSubtext: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="Begin with Module 1 to understand why booking websites are essential..."
                />
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-brown-dark">Course Features</h2>
              <button
                onClick={addFeature}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                + Add Feature
              </button>
            </div>

            {courseInfo.features.length === 0 ? (
              <p className="text-brown-dark/60">No features yet. Click "Add Feature" to create one.</p>
            ) : (
              <div className="space-y-4">
                {courseInfo.features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-pink-light/30 border border-brown-light rounded-lg p-4 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-1">
                          Icon (Emoji)
                        </label>
                        <input
                          type="text"
                          value={feature.icon}
                          onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                          placeholder="📅"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-1">
                          Feature Title
                        </label>
                        <input
                          type="text"
                          value={feature.title}
                          onChange={(e) => updateFeature(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                          placeholder="Online Booking System"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={feature.description}
                          onChange={(e) => updateFeature(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                          placeholder="Clients can book appointments 24/7"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeFeature(index)}
                      className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition text-sm"
                    >
                      Remove Feature
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

