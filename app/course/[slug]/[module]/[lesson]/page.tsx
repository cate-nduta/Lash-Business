import { notFound } from 'next/navigation'
import Link from 'next/link'
import { readFile } from 'fs/promises'
import path from 'path'
import { marked } from 'marked'
import { loadCourseStructure } from '@/lib/course-structure-server'
import { findCourseBySlugOrId, getCourseSlug } from '@/lib/courses-utils'
import { promises as fs } from 'fs'
import { type Course } from '@/types/course'
import LessonCompletionTracker from '@/components/LessonCompletionTracker'
import NextLessonButton from '@/components/NextLessonButton'

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

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
    console.error('[LESSON PAGE] Error reading local courses.json:', error)
  }

  return { courses: [], discounts: [] }
}

// Enable dynamic route parameters
export const dynamicParams = true
export const dynamic = 'force-dynamic'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; module: string; lesson: string }>
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

    // Extract lesson number from "lesson1", "lesson2", etc.
    const lessonParam = resolvedParams.lesson.toLowerCase()
    const lessonMatch = lessonParam.match(/^lesson(\d+)$/)
    
    if (!lessonMatch) {
      notFound()
    }

    const lessonId = lessonMatch[1]

    // Load course catalog
    const catalog = await loadCoursesFromFile()
    const course = findCourseBySlugOrId(catalog.courses, slug)

    if (!course || !course.isActive) {
      notFound()
    }

    const courseSlug = getCourseSlug(course)

    // Load course structure based on course ID
    const courseStructure = loadCourseStructure(course.id)
    const courseModule = courseStructure.find(m => m.id === moduleId)
    
    if (!courseModule) {
      notFound()
    }

    const lesson = courseModule.lessons.find(l => l.id === lessonId)
    if (!lesson) {
      notFound()
    }

    // Get lesson index for navigation
    const lessonIndex = courseModule.lessons.findIndex(l => l.id === lessonId)
    const prevLesson = lessonIndex > 0 ? courseModule.lessons[lessonIndex - 1] : null
    const nextLesson = lessonIndex < courseModule.lessons.length - 1 ? courseModule.lessons[lessonIndex + 1] : null

    // Get module index for module navigation
    const moduleIndex = courseStructure.findIndex(m => m.id === moduleId)
    const prevModule = moduleIndex > 0 ? courseStructure[moduleIndex - 1] : null
    const nextModule = moduleIndex < courseStructure.length - 1 ? courseStructure[moduleIndex + 1] : null

    // Try to read lesson content file
    let content = ''
    try {
      // Try the lesson-specific file in course-content directory
      const lessonFile = path.join(process.cwd(), `course-content/module-${moduleId}/lesson-${lessonId}.md`)
      content = await readFile(lessonFile, 'utf-8')
    } catch (error) {
      // Fallback: create placeholder content
      console.log(`Lesson file not found: course-content/module-${moduleId}/lesson-${lessonId}.md`)
      content = `# ${lesson.title}\n\n${lesson.description}\n\n## Lesson Content\n\nThis lesson is part of **${courseModule.title}**.\n\n**Estimated Time**: ${lesson.estimatedTime}\n\n---\n\n## Coming Soon\n\nThe detailed content for this lesson is being prepared. Check back soon!\n\n---\n\n## What You'll Learn\n\nIn this lesson, you'll learn:\n\n- Key concepts related to ${lesson.title.toLowerCase()}\n- Step-by-step instructions\n- Code examples and explanations\n- Best practices and tips\n\n---\n\n## Next Steps\n\nOnce this lesson content is available, you'll be able to:\n\n1. Follow detailed step-by-step instructions\n2. See code examples with explanations\n3. Complete hands-on exercises\n4. Test your understanding\n\n**Stay tuned for the full lesson content!**`
    }

    const htmlContent = await marked(content)

    return (
      <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/course/${courseSlug}/modules`} className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2 block">
                    ← Back to Modules
                  </Link>
                  <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600 mb-2 flex-wrap">
                    <Link href={`/course/${courseSlug}/modules`} className="hover:text-blue-600 truncate">Modules</Link>
                    <span>→</span>
                    <Link href={`/course/${courseSlug}/module${moduleId}`} className="hover:text-blue-600 truncate">
                      {courseModule.title}
                    </Link>
                    <span>→</span>
                    <span className="text-gray-900 font-medium truncate">{lesson.title}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Lesson {lessonIndex + 1}: {lesson.title}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">{lesson.description}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {prevLesson && (
                    <Link
                      href={`/course/${courseSlug}/module${moduleId}/lesson${prevLesson.id}`}
                      className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg whitespace-nowrap"
                    >
                      ← Prev
                    </Link>
                  )}
                  {nextLesson ? (
                    <NextLessonButton
                      courseId={course.id}
                      moduleId={moduleId}
                      lessonId={lessonId}
                      href={`/course/${courseSlug}/module${moduleId}/lesson${nextLesson.id}`}
                      className="px-2 sm:px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                    >
                      Next →
                    </NextLessonButton>
                  ) : nextModule ? (
                    <NextLessonButton
                      courseId={course.id}
                      moduleId={moduleId}
                      lessonId={lessonId}
                      href={`/course/${courseSlug}/module${nextModule.id}`}
                      className="px-2 sm:px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                    >
                      Next Module →
                    </NextLessonButton>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

      {/* Lesson Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <LessonCompletionTracker
          courseId={course.id}
          moduleId={moduleId}
          lessonId={lessonId}
        />
        <div
          className="prose prose-sm sm:prose-base md:prose-lg max-w-none bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 lg:p-12"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

            {/* Lesson Navigation Footer */}
            <div className="mt-8 sm:mt-12 bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {prevLesson ? (
                    <Link
                      href={`/course/${courseSlug}/module${moduleId}/lesson${prevLesson.id}`}
                      className="block text-blue-600 hover:text-blue-700"
                    >
                      <div className="text-xs sm:text-sm text-gray-500">Previous Lesson</div>
                      <div className="text-sm sm:text-base font-semibold truncate">← {prevLesson.title}</div>
                    </Link>
                  ) : prevModule ? (
                    <Link
                      href={`/course/${courseSlug}/module${prevModule.id}`}
                      className="block text-blue-600 hover:text-blue-700"
                    >
                      <div className="text-xs sm:text-sm text-gray-500">Previous Module</div>
                      <div className="text-sm sm:text-base font-semibold truncate">← {prevModule.title}</div>
                    </Link>
                  ) : null}
                </div>
                <div className="flex-1 text-right min-w-0">
                  {nextLesson ? (
                    <NextLessonButton
                      courseId={course.id}
                      moduleId={moduleId}
                      lessonId={lessonId}
                      href={`/course/${courseSlug}/module${moduleId}/lesson${nextLesson.id}`}
                      className="block text-blue-600 hover:text-blue-700"
                    >
                      <div className="text-xs sm:text-sm text-gray-500">Next Lesson</div>
                      <div className="text-sm sm:text-base font-semibold truncate">{nextLesson.title} →</div>
                    </NextLessonButton>
                  ) : nextModule ? (
                    <NextLessonButton
                      courseId={course.id}
                      moduleId={moduleId}
                      lessonId={lessonId}
                      href={`/course/${courseSlug}/module${nextModule.id}`}
                      className="block text-blue-600 hover:text-blue-700"
                    >
                      <div className="text-xs sm:text-sm text-gray-500">Next Module</div>
                      <div className="text-sm sm:text-base font-semibold truncate">{nextModule.title} →</div>
                    </NextLessonButton>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Back to Module */}
            <div className="mt-6 text-center">
              <Link
                href={`/course/${courseSlug}/module${moduleId}`}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to {courseModule.title} Overview
              </Link>
            </div>
          </div>
        </div>
    )
  } catch (error) {
    console.error('Error loading lesson page:', error)
    throw error
  }
}

