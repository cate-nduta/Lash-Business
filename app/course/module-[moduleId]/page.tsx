import { notFound } from 'next/navigation'
import Link from 'next/link'
import { courseStructure } from '@/lib/course-structure'

export default async function ModuleOverviewPage({
  params,
}: {
  params: { moduleId: string }
}) {
  const moduleId = params.moduleId
  const courseModule = courseStructure.find(m => m.id === moduleId)

  if (!courseModule) {
    notFound()
  }

  const moduleIndex = courseStructure.findIndex(m => m.id === moduleId)
  const prevModule = moduleIndex > 0 ? courseStructure[moduleIndex - 1] : null
  const nextModule = moduleIndex < courseStructure.length - 1 ? courseStructure[moduleIndex + 1] : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/course" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                ← Back to Course
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                {courseModule.title}
              </h1>
              <p className="text-gray-600 mt-1">{courseModule.description}</p>
            </div>
            <div className="flex items-center space-x-4">
              {prevModule && (
                <Link
                  href={`/course/module-${prevModule.id}`}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
                >
                  ← Previous Module
                </Link>
              )}
              {nextModule && (
                <Link
                  href={`/course/module-${nextModule.id}`}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next Module →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Module Overview */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Module Overview</h2>
              <p className="text-gray-600">
                This module contains {courseModule.lessons.length} lessons and takes approximately {courseModule.estimatedTime} to complete.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Estimated Time</div>
              <div className="text-2xl font-bold text-blue-600">{courseModule.estimatedTime}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>0% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>

        {/* Lessons List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Lessons in This Module</h2>
          <div className="space-y-4">
            {courseModule.lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                href={`/course/module-${moduleId}/lesson-${lesson.id}`}
                className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-blue-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{lesson.title}</h3>
                      <p className="text-gray-600 mb-3">{lesson.description}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-4">⏱️ {lesson.estimatedTime}</span>
                        <span className="text-blue-600 font-semibold">Start Lesson →</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              {prevModule && (
                <Link
                  href={`/course/module-${prevModule.id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← {prevModule.title}
                </Link>
              )}
            </div>
            <div>
              {nextModule && (
                <Link
                  href={`/course/module-${nextModule.id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
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
}

