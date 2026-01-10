'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import AdminBackButton from '@/components/AdminBackButton'
import { type Module, type Lesson } from '@/lib/course-structure'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function CourseStructurePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  
  const [structure, setStructure] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<{ moduleId: string; lessonId: string } | null>(null)

  useEffect(() => {
    checkAuthAndLoad()
  }, [courseId])

  const checkAuthAndLoad = async () => {
    try {
      const response = await authorizedFetch('/api/admin/current-user')
      if (!response.ok) {
        router.replace('/admin/login')
        return
      }
      const data = await response.json()
      if (!data.authenticated) {
        router.replace('/admin/login')
        return
      }
      loadStructure()
    } catch (error) {
      router.replace('/admin/login')
    }
  }

  const loadStructure = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/structure`, {
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error('Failed to load course structure')
      }
      const data = await response.json()
      setStructure(data.structure || [])
      // Expand all modules by default
      setExpandedModules(new Set(data.structure?.map((m: Module) => m.id) || []))
    } catch (error) {
      console.error('Error loading structure:', error)
      setMessage({ type: 'error', text: 'Failed to load course structure' })
    } finally {
      setLoading(false)
    }
  }

  const saveStructure = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Save to file system
      const response = await authorizedFetch(`/api/admin/courses/${courseId}/structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structure }),
      })

      if (!response.ok) {
        throw new Error('Failed to save course structure')
      }

      setMessage({ type: 'success', text: 'Course structure saved successfully!' })
    } catch (error) {
      console.error('Error saving structure:', error)
      setMessage({ type: 'error', text: 'Failed to save course structure' })
    } finally {
      setSaving(false)
    }
  }

  const addModule = () => {
    const newModule: Module = {
      id: `module-${Date.now()}`,
      title: 'New Module',
      description: '',
      estimatedTime: '1 hour',
      status: 'pending',
      lessons: [],
    }
    setStructure([...structure, newModule])
    setEditingModuleId(newModule.id)
  }

  const updateModule = (moduleId: string, updates: Partial<Module>) => {
    setStructure(structure.map(m => 
      m.id === moduleId ? { ...m, ...updates } : m
    ))
  }

  const deleteModule = (moduleId: string) => {
    if (confirm('Are you sure you want to delete this module? All lessons will be deleted too.')) {
      setStructure(structure.filter(m => m.id !== moduleId))
    }
  }

  const addLesson = (moduleId: string) => {
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      title: 'New Lesson',
      description: '',
      estimatedTime: '15 minutes',
    }
    setStructure(structure.map(m => 
      m.id === moduleId 
        ? { ...m, lessons: [...m.lessons, newLesson] }
        : m
    ))
    setEditingLessonId({ moduleId, lessonId: newLesson.id })
  }

  const updateLesson = (moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
    setStructure(structure.map(m => 
      m.id === moduleId
        ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l) }
        : m
    ))
  }

  const deleteLesson = (moduleId: string, lessonId: string) => {
    if (confirm('Are you sure you want to delete this lesson?')) {
      setStructure(structure.map(m => 
        m.id === moduleId
          ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
          : m
      ))
    }
  }

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-brown-dark mb-2">Course Structure & Lessons</h1>
            <p className="text-brown-dark/70">Manage modules and lessons for this course</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/courses"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back to Courses
            </Link>
            <button
              onClick={saveStructure}
              disabled={saving}
              className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Structure'}
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

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-brown-dark">Modules & Lessons</h2>
            <button
              onClick={addModule}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + Add Module
            </button>
          </div>

          {structure.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">No modules yet.</p>
              <button
                onClick={addModule}
                className="px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors"
              >
                Create Your First Module
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {structure.map((module, moduleIndex) => (
                <div
                  key={module.id}
                  className="bg-pink-light/30 border border-brown-light rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {editingModuleId === module.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={module.title}
                            onChange={(e) => updateModule(module.id, { title: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark text-lg font-semibold"
                            placeholder="Module Title"
                          />
                          <textarea
                            value={module.description}
                            onChange={(e) => updateModule(module.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark"
                            placeholder="Module description"
                            rows={2}
                          />
                          <input
                            type="text"
                            value={module.estimatedTime}
                            onChange={(e) => updateModule(module.id, { estimatedTime: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark"
                            placeholder="Estimated time (e.g., 1-2 hours)"
                          />
                          <select
                            value={module.status}
                            onChange={(e) => updateModule(module.id, { status: e.target.value as 'completed' | 'pending' })}
                            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark"
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingModuleId(null)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => deleteModule(module.id)}
                              className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition"
                            >
                              Delete Module
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-brown-dark">
                              Module {moduleIndex + 1}: {module.title}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              module.status === 'completed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {module.status}
                            </span>
                          </div>
                          {module.description && (
                            <p className="text-brown-dark/70 mb-2">{module.description}</p>
                          )}
                          <p className="text-sm text-brown-dark/60">
                            {module.lessons.length} lessons • {module.estimatedTime}
                          </p>
                        </div>
                      )}
                    </div>
                    {editingModuleId !== module.id && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingModuleId(module.id)}
                          className="px-3 py-1.5 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleModule(module.id)}
                          className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
                        >
                          {expandedModules.has(module.id) ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    )}
                  </div>

                  {expandedModules.has(module.id) && (
                    <div className="mt-4 border-t border-brown-light/40 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-brown-dark">Lessons</h4>
                        <button
                          onClick={() => addLesson(module.id)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          + Add Lesson
                        </button>
                      </div>
                      {module.lessons.length === 0 ? (
                        <p className="text-sm text-brown-dark/60">No lessons in this module yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <div
                              key={lesson.id}
                              className="bg-white border border-brown-light rounded-lg p-4"
                            >
                              {editingLessonId?.moduleId === module.id && editingLessonId?.lessonId === lesson.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={lesson.title}
                                    onChange={(e) => updateLesson(module.id, lesson.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark font-semibold"
                                    placeholder="Lesson Title"
                                  />
                                  <textarea
                                    value={lesson.description}
                                    onChange={(e) => updateLesson(module.id, lesson.id, { description: e.target.value })}
                                    className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark"
                                    placeholder="Lesson description"
                                    rows={2}
                                  />
                                  <input
                                    type="text"
                                    value={lesson.estimatedTime}
                                    onChange={(e) => updateLesson(module.id, lesson.id, { estimatedTime: e.target.value })}
                                    className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown-dark"
                                    placeholder="Estimated time (e.g., 15 minutes)"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setEditingLessonId(null)}
                                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                                    >
                                      Done
                                    </button>
                                    <button
                                      onClick={() => deleteLesson(module.id, lesson.id)}
                                      className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition text-sm"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium text-brown-dark">
                                        Lesson {lessonIndex + 1}: {lesson.title}
                                      </span>
                                    </div>
                                    {lesson.description && (
                                      <p className="text-sm text-brown-dark/70 mb-1">{lesson.description}</p>
                                    )}
                                    <p className="text-xs text-brown-dark/60">{lesson.estimatedTime}</p>
                                  </div>
                                  <button
                                    onClick={() => setEditingLessonId({ moduleId: module.id, lessonId: lesson.id })}
                                    className="px-3 py-1.5 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm ml-4"
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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









