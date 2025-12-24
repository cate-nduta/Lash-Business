import { notFound } from 'next/navigation'
import Link from 'next/link'
import { readFile } from 'fs/promises'
import path from 'path'
import { marked } from 'marked'
import { courseStructure } from '@/lib/course-structure'

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

export default async function LessonPage({
  params,
}: {
  params: { moduleId: string; lessonId: string }
}) {
  const { moduleId, lessonId } = params

  const courseModule = courseStructure.find(m => m.id === moduleId)
  if (!courseModule) notFound()

  const lesson = courseModule.lessons.find(l => l.id === lessonId)
  if (!lesson) notFound()

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
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                <Link href="/course" className="hover:text-blue-600">Course</Link>
                <span>→</span>
                <Link href={`/course/module-${moduleId}`} className="hover:text-blue-600">
                  {courseModule.title}
                </Link>
                <span>→</span>
                <span className="text-gray-900 font-medium">{lesson.title}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Lesson {lessonIndex + 1}: {lesson.title}
              </h1>
              <p className="text-gray-600 mt-1">{lesson.description}</p>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {prevLesson && (
                <Link
                  href={`/course/module-${moduleId}/lesson-${prevLesson.id}`}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
                >
                  ← Prev
                </Link>
              )}
              {nextLesson ? (
                <Link
                  href={`/course/module-${moduleId}/lesson-${nextLesson.id}`}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next →
                </Link>
              ) : nextModule ? (
                <Link
                  href={`/course/module-${nextModule.id}`}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next Module →
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          className="prose prose-lg max-w-none bg-white rounded-lg shadow-md p-8 md:p-12"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Lesson Navigation Footer */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {prevLesson ? (
                <Link
                  href={`/course/module-${moduleId}/lesson-${prevLesson.id}`}
                  className="block text-blue-600 hover:text-blue-700"
                >
                  <div className="text-sm text-gray-500">Previous Lesson</div>
                  <div className="font-semibold">← {prevLesson.title}</div>
                </Link>
              ) : prevModule ? (
                <Link
                  href={`/course/module-${prevModule.id}`}
                  className="block text-blue-600 hover:text-blue-700"
                >
                  <div className="text-sm text-gray-500">Previous Module</div>
                  <div className="font-semibold">← {prevModule.title}</div>
                </Link>
              ) : null}
            </div>
            <div className="flex-1 text-right">
              {nextLesson ? (
                <Link
                  href={`/course/module-${moduleId}/lesson-${nextLesson.id}`}
                  className="block text-blue-600 hover:text-blue-700"
                >
                  <div className="text-sm text-gray-500">Next Lesson</div>
                  <div className="font-semibold">{nextLesson.title} →</div>
                </Link>
              ) : nextModule ? (
                <Link
                  href={`/course/module-${nextModule.id}`}
                  className="block text-blue-600 hover:text-blue-700"
                >
                  <div className="text-sm text-gray-500">Next Module</div>
                  <div className="font-semibold">{nextModule.title} →</div>
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {/* Back to Module */}
        <div className="mt-6 text-center">
          <Link
            href={`/course/module-${moduleId}`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to {courseModule.title} Overview
          </Link>
        </div>
      </div>
    </div>
  )
}

