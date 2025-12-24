'use client'

import { useEffect, useState, useRef } from 'react'
import { useLessonProgress } from './CourseProgressTracker'
import { markLessonComplete, markLessonIncomplete } from '@/lib/course-progress'

interface LessonCompletionTrackerProps {
  courseId: string
  moduleId: string
  lessonId: string
  onScrollToBottom?: (hasScrolledToBottom: boolean) => void
}

// Export function for lesson completion (simplified - no scroll tracking)
export function useLessonCompletion(courseId: string, moduleId: string, lessonId: string) {
  const { isCompleted } = useLessonProgress(courseId, moduleId, lessonId)

  // No scroll tracking - lessons are marked complete when user clicks "Next"
  return { isCompleted }
}

export default function LessonCompletionTracker({
  courseId,
  moduleId,
  lessonId,
  onScrollToBottom,
}: LessonCompletionTrackerProps) {
  const { isCompleted, toggleComplete } = useLessonProgress(courseId, moduleId, lessonId)
  const { isCompleted: isCompletedFromHook } = useLessonCompletion(courseId, moduleId, lessonId)

  // Listen for completion events
  useEffect(() => {
    const handleProgressUpdate = () => {
      // Progress was updated, component will re-render
    }
    window.addEventListener('lessonProgressChanged', handleProgressUpdate)
    return () => window.removeEventListener('lessonProgressChanged', handleProgressUpdate)
  }, [])

  return (
    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 gap-3 sm:gap-0">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {isCompleted ? (
          <>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              ✓
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-semibold text-green-800">Lesson Completed</div>
              <div className="text-xs sm:text-sm text-green-600">Great job! You've completed this lesson.</div>
            </div>
          </>
        ) : (
          <>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              ○
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-semibold text-blue-800">In Progress</div>
              <div className="text-xs sm:text-sm text-blue-600">
                Click "Next Lesson" to mark this lesson as complete and continue
              </div>
            </div>
          </>
        )}
      </div>
      <button
        onClick={toggleComplete}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
          isCompleted
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
      </button>
    </div>
  )
}

