import { notFound } from 'next/navigation'
import Link from 'next/link'
import { loadCourseStructure } from '@/lib/course-structure-server'
import { findCourseBySlugOrId, getCourseSlug } from '@/lib/courses-utils'
import { promises as fs } from 'fs'
import path from 'path'
import { type Course } from '@/types/course'
import { type Module } from '@/lib/course-structure'
import ModuleStatusBadge from '@/components/ModuleStatusBadge'

async function loadCoursesFromFile(): Promise<{ courses: Course[]; discounts: any[] }> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'courses.json')
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(content)

    if (Array.isArray(parsed?.courses)) {
      return {
        courses: parsed.courses as Course[],
        discounts: Array.isArray(parsed?.discounts) ? parsed.discounts : [],
      }
    }
  } catch (error) {
    console.error('[MODULES PAGE] Error reading local courses.json:', error)
  }

  return { courses: [], discounts: [] }
}

// Enable dynamic route parameters
export const dynamicParams = true
export const dynamic = 'force-dynamic'

export default async function ModulesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  try {
    const resolvedParams = await params
    // Decode the slug
    let slug = resolvedParams.slug
    try {
      slug = decodeURIComponent(resolvedParams.slug)
    } catch (e) {
      slug = resolvedParams.slug
    }

    // Load course catalog
    const catalog = await loadCoursesFromFile()
    const course = findCourseBySlugOrId(catalog.courses, slug)

    if (!course || !course.isActive) {
      notFound()
    }

    // Load course structure based on course ID
    const courseStructure = loadCourseStructure(course.id)
    const courseSlug = getCourseSlug(course)

    // Calculate total lessons
    const totalLessons = courseStructure.reduce((sum, module) => sum + module.lessons.length, 0)

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Link href={`/course/${courseSlug}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  ← Back to Course
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                  {course.title}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  {totalLessons} lessons across {courseStructure.length} modules
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modules List */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Modules</h2>
            <p className="text-gray-600">
              Select a module to begin your learning journey. Complete modules in order for the best experience.
            </p>
          </div>

          <div className="space-y-6">
            {courseStructure.map((module: Module, index: number) => (
              <div
                key={module.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                          Module {module.id}
                        </span>
                        {/* Per-user module completion status */}
                        <ModuleStatusBadge
                          courseId={course.id}
                          moduleId={module.id}
                          totalLessons={module.lessons.length}
                        />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                        {module.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{module.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {module.estimatedTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Link
                        href={`/course/${courseSlug}/module${module.id}`}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {index === 0 ? 'Start Module' : 'View Module'}
                        <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>

                  {/* Lessons Preview */}
                  {module.lessons.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Lessons in this module:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {module.lessons.slice(0, 6).map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <span className="text-blue-600 font-semibold mt-0.5">{lessonIndex + 1}.</span>
                            <span className="flex-1">{lesson.title}</span>
                          </div>
                        ))}
                        {module.lessons.length > 6 && (
                          <div className="text-sm text-gray-500 italic">
                            + {module.lessons.length - 6} more {module.lessons.length - 6 === 1 ? 'lesson' : 'lessons'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Course Progress Info */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to begin?</h3>
            <p className="text-gray-700 mb-4">
              Start with Module 1 and work through each module in order. Each module builds on the previous one,
              giving you a complete understanding of how to build your booking website.
            </p>
            {courseStructure.length > 0 && (
              <Link
                href={`/course/${courseSlug}/module${courseStructure[0].id}`}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start with Module 1
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading modules page:', error)
    throw error
  }
}

