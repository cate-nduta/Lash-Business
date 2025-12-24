'use client'

import Link from 'next/link'
import { useLessonProgress } from './CourseProgressTracker'

interface LessonCardProps {
  courseId: string
  courseSlug: string
  moduleId: string
  lesson: {
    id: string
    title: string
    description: string
    estimatedTime: string
  }
  index: number
}

export default function LessonCard({
  courseId,
  courseSlug,
  moduleId,
  lesson,
  index,
}: LessonCardProps) {
  const { isCompleted } = useLessonProgress(courseId, moduleId, lesson.id)

  return (
    <Link
      href={`/course/${courseSlug}/module${moduleId}/lesson${lesson.id}`}
      className={`block rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 ${
        isCompleted
          ? 'bg-green-50 border-green-500'
          : 'bg-white border-blue-500'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0 ${
              isCompleted
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            {isCompleted ? '✓' : index + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-gray-900">{lesson.title}</h3>
              {isCompleted && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-semibold">
                  Completed
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-3">{lesson.description}</p>
            <div className="flex items-center text-sm text-gray-500">
              <span className="mr-4">⏱️ {lesson.estimatedTime}</span>
              <span className="text-blue-600 font-semibold">
                {isCompleted ? 'Review Lesson →' : 'Start Lesson →'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

