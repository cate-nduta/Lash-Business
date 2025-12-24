'use client'

import { useEffect, useState } from 'react'
import { getModuleProgress, type ModuleProgress } from '@/lib/course-progress'
import CourseProgressTracker from './CourseProgressTracker'

interface ModuleProgressBarProps {
  courseId: string
  moduleId: string
  totalLessons: number
}

export default function ModuleProgressBar({
  courseId,
  moduleId,
  totalLessons,
}: ModuleProgressBarProps) {
  // Always start with 0% to match server-side rendering (prevents hydration mismatch)
  const [progress, setProgress] = useState<ModuleProgress>({
    moduleId,
    completedLessons: [],
    progressPercentage: 0,
  })

  useEffect(() => {
    // Only read from localStorage on client-side after mount (prevents hydration mismatch)
    const currentProgress = getModuleProgress(courseId, moduleId, totalLessons)
    setProgress(currentProgress)
  }, [courseId, moduleId, totalLessons])

  return (
    <>
      <CourseProgressTracker
        courseId={courseId}
        moduleId={moduleId}
        totalLessons={totalLessons}
        onProgressUpdate={setProgress}
      />
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progress.progressPercentage}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.progressPercentage}%` }}
          ></div>
        </div>
      </div>
    </>
  )
}

