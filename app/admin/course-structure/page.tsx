'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import AdminBackButton from '@/components/AdminBackButton'
import { type Module, type Lesson } from '@/lib/course-structure'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminCourseStructure() {
  const [structure, setStructure] = useState<Module[]>([])
  const [originalStructure, setOriginalStructure] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<{ moduleId: string; lessonId: string } | null>(null)
  const router = useRouter()

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(structure) !== JSON.stringify(originalStructure),
    [structure, originalStructure],
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
        loadStructure(abortController.signal)
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

  const loadStructure = async (signal?: AbortSignal) => {
    try {
      const fetchOptions: RequestInit = {}
      if (signal) {
        fetchOptions.signal = signal
      }
      const response = await authorizedFetch('/api/admin/course-structure', fetchOptions)
      if (signal?.aborted) return
      if (!response.ok) {
        throw new Error('Failed to load course structure')
      }
      const data = await response.json()
      if (signal?.aborted) return
      setStructure(data.structure || [])
      setOriginalStructure(data.structure || [])
      // Expand first module by default
      if (data.structure && data.structure.length > 0) {
        setExpandedModules(new Set([data.structure[0].id]))
      }
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        return
      }
      console.error('Error loading course structure:', error)
      if (!signal?.aborted) {
        setMessage({ type: 'error', text: 'Failed to load course structure' })
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
      const response = await authorizedFetch('/api/admin/course-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structure }),
      })

      if (!response.ok) {
        throw new Error('Failed to save course structure')
      }

      setOriginalStructure(structure)
      setMessage({ type: 'success', text: 'Course structure updated successfully!' })
      setEditingModuleId(null)
      setEditingLessonId(null)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Error saving course structure:', error)
      setMessage({ type: 'error', text: 'Failed to save course structure' })
    } finally {
      setSaving(false)
    }
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId)
      } else {
        newSet.add(moduleId)
      }
      return newSet
    })
  }

  const updateModule = (moduleId: string, updates: Partial<Module>) => {
    setStructure(prev =>
      prev.map(module =>
        module.id === moduleId ? { ...module, ...updates } : module
      )
    )
  }

  const updateLesson = (moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
    setStructure(prev =>
      prev.map(module =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons.map(lesson =>
                lesson.id === lessonId ? { ...lesson, ...updates } : lesson
              ),
            }
          : module
      )
    )
  }

  const addLesson = (moduleId: string) => {
    setStructure(prev =>
      prev.map(module =>
        module.id === moduleId
          ? {
              ...module,
              lessons: [
                ...module.lessons,
                {
                  id: `${module.lessons.length + 1}`,
                  title: 'New Lesson',
                  description: '',
                  estimatedTime: '15 minutes',
                },
              ],
            }
          : module
      )
    )
  }

  const removeLesson = (moduleId: string, lessonId: string) => {
    const courseModule = structure.find(m => m.id === moduleId)
    const lesson = courseModule?.lessons.find(l => l.id === lessonId)
    if (!lesson) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${lesson.title}"? This action cannot be undone.`
    )
    if (!confirmed) return

    setStructure(prev =>
      prev.map(module =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons.filter(lesson => lesson.id !== lessonId),
            }
          : module
      )
    )
  }

  const moveLesson = (moduleId: string, lessonId: string, direction: 'up' | 'down') => {
    setStructure(prev =>
      prev.map(module => {
        if (module.id !== moduleId) return module

        const lessons = [...module.lessons]
        const index = lessons.findIndex(l => l.id === lessonId)
        if (index === -1) return module

        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= lessons.length) return module

        const [removed] = lessons.splice(index, 1)
        lessons.splice(targetIndex, 0, removed)

        return { ...module, lessons }
      })
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading course structure...</div>
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

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-display text-brown-dark mb-6">Course Structure</h1>
          <p className="text-brown mb-6">
            Edit modules and lessons. Changes here affect the course navigation and lesson pages.
          </p>

          <div className="space-y-4">
            {structure.map((module, moduleIndex) => {
              const isExpanded = expandedModules.has(module.id)
              const isEditing = editingModuleId === module.id

              return (
                <div
                  key={module.id}
                  className="bg-pink-light/30 border border-brown-light rounded-xl p-6"
                >
                  {/* Module Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="text-brown-dark hover:text-brown transition-colors"
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={module.title}
                              onChange={(e) => updateModule(module.id, { title: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark font-semibold text-lg"
                            />
                            <textarea
                              value={module.description}
                              onChange={(e) => updateModule(module.id, { description: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                            />
                            <input
                              type="text"
                              value={module.estimatedTime}
                              onChange={(e) => updateModule(module.id, { estimatedTime: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                              placeholder="e.g., 1-2 hours"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingModuleId(null)}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h2 className="text-xl font-semibold text-brown-dark">
                              Module {module.id}: {module.title}
                            </h2>
                            <p className="text-brown text-sm">{module.description}</p>
                            <p className="text-brown-dark/60 text-xs mt-1">
                              {module.estimatedTime} • {module.lessons.length} lessons
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    {!isEditing && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingModuleId(module.id)}
                          className="px-3 py-1.5 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lessons List */}
                  {isExpanded && (
                    <div className="ml-8 space-y-3 mt-4">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const isEditingLesson = editingLessonId?.moduleId === module.id && editingLessonId?.lessonId === lesson.id

                        return (
                          <div
                            key={lesson.id}
                            className="bg-white border border-brown-light rounded-lg p-4"
                          >
                            {isEditingLesson ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={lesson.title}
                                  onChange={(e) => updateLesson(module.id, lesson.id, { title: e.target.value })}
                                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark font-semibold"
                                />
                                <textarea
                                  value={lesson.description}
                                  onChange={(e) => updateLesson(module.id, lesson.id, { description: e.target.value })}
                                  rows={2}
                                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                                />
                                <input
                                  type="text"
                                  value={lesson.estimatedTime}
                                  onChange={(e) => updateLesson(module.id, lesson.id, { estimatedTime: e.target.value })}
                                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                                  placeholder="e.g., 15 minutes"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingLessonId(null)}
                                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                                  >
                                    Done
                                  </button>
                                  <button
                                    onClick={() => removeLesson(module.id, lesson.id)}
                                    className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-brown-dark">
                                    Lesson {lesson.id}: {lesson.title}
                                  </h3>
                                  <p className="text-brown text-sm mt-1">{lesson.description}</p>
                                  <p className="text-brown-dark/60 text-xs mt-1">
                                    ⏱️ {lesson.estimatedTime}
                                  </p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <button
                                    onClick={() => moveLesson(module.id, lesson.id, 'up')}
                                    disabled={lessonIndex === 0}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 disabled:opacity-40"
                                    title="Move up"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveLesson(module.id, lesson.id, 'down')}
                                    disabled={lessonIndex === module.lessons.length - 1}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 disabled:opacity-40"
                                    title="Move down"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    onClick={() => setEditingLessonId({ moduleId: module.id, lessonId: lesson.id })}
                                    className="px-3 py-1.5 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <button
                        onClick={() => addLesson(module.id)}
                        className="w-full px-4 py-2 border-2 border-dashed border-brown-light rounded-lg text-brown-dark hover:bg-pink-light/60 transition-colors text-sm"
                      >
                        + Add Lesson
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

