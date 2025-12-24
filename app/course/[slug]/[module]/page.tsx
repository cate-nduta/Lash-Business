import { notFound } from 'next/navigation'
import Link from 'next/link'
import { loadCourseStructure } from '@/lib/course-structure-server'
import { findCourseBySlugOrId, getCourseSlug } from '@/lib/courses-utils'
import { promises as fs } from 'fs'
import path from 'path'
import { type Course } from '@/types/course'
import ModuleProgressBar from '@/components/ModuleProgressBar'
import LessonCard from '@/components/LessonCard'

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
    console.error('[MODULE PAGE] Error reading local courses.json:', error)
  }

  return { courses: [], discounts: [] }
}

// Enable dynamic route parameters
export const dynamicParams = true
export const dynamic = 'force-dynamic'

export default async function ModuleOverviewPage({
  params,
}: {
  params: Promise<{ slug: string; module: string }>
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

    // Extract module number from "module1", "module2", etc.
    const moduleParam = resolvedParams.module.toLowerCase()
    const moduleMatch = moduleParam.match(/^module(\d+)$/)
    
    if (!moduleMatch) {
      notFound()
    }

    const moduleId = moduleMatch[1]
    
    // Load course catalog
    const catalog = await loadCoursesFromFile()
    const course = findCourseBySlugOrId(catalog.courses, slug)

    if (!course || !course.isActive) {
      notFound()
    }

    // Load course structure based on course ID
    const courseStructure = loadCourseStructure(course.id)
    const courseModule = courseStructure.find(m => m.id === moduleId)

    if (!courseModule) {
      notFound()
    }

    const moduleIndex = courseStructure.findIndex(m => m.id === moduleId)
    const prevModule = moduleIndex > 0 ? courseStructure[moduleIndex - 1] : null
    const nextModule = moduleIndex < courseStructure.length - 1 ? courseStructure[moduleIndex + 1] : null

    const courseSlug = getCourseSlug(course)

    return (
      <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/course/${courseSlug}/modules`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    ← Back to Modules
                  </Link>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                    {courseModule.title}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">{courseModule.description}</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  {prevModule && (
                    <Link
                      href={`/course/${courseSlug}/module${prevModule.id}`}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg whitespace-nowrap"
                    >
                      ← Prev
                    </Link>
                  )}
                  {nextModule && (
                    <Link
                      href={`/course/${courseSlug}/module${nextModule.id}`}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                    >
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Module Overview */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Module Overview</h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    This module contains {courseModule.lessons.length} lessons and takes approximately {courseModule.estimatedTime} to complete.
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm text-gray-500">Estimated Time</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{courseModule.estimatedTime}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <ModuleProgressBar
                courseId={course.id}
                moduleId={moduleId}
                totalLessons={courseModule.lessons.length}
              />
            </div>

            {/* Lessons List */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Lessons in This Module</h2>
              <div className="space-y-4">
                {courseModule.lessons.map((lesson, index) => (
                  <LessonCard
                    key={lesson.id}
                    courseId={course.id}
                    courseSlug={courseSlug}
                    moduleId={moduleId}
                    lesson={lesson}
                    index={index}
                  />
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {prevModule && (
                    <Link
                      href={`/course/${courseSlug}/module${prevModule.id}`}
                      className="text-sm sm:text-base text-blue-600 hover:text-blue-700 font-medium block truncate"
                    >
                      ← {prevModule.title}
                    </Link>
                  )}
                </div>
                <div className="flex-1 text-right min-w-0">
                  {nextModule && (
                    <Link
                      href={`/course/${courseSlug}/module${nextModule.id}`}
                      className="text-sm sm:text-base text-blue-600 hover:text-blue-700 font-medium block truncate"
                    >
                      {nextModule.title} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    )
  } catch (error) {
    console.error('Error loading module page:', error)
    throw error
  }
}

