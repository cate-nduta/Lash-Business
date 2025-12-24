'use client'

import { useEffect, useState } from 'react'
import { getModuleProgress, type ModuleProgress } from '@/lib/course-progress'

interface ModuleStatusBadgeProps {
  courseId: string
  moduleId: string
  totalLessons: number
}

export default function ModuleStatusBadge({
  courseId,
  moduleId,
  totalLessons,
}: ModuleStatusBadgeProps) {
  // Start as not completed to match server render (prevents hydration mismatch)
  const [progress, setProgress] = useState<ModuleProgress>({
    moduleId,
    completedLessons: [],
    progressPercentage: 0,
  })

  useEffect(() => {
    // Read from localStorage on client
    const current = getModuleProgress(courseId, moduleId, totalLessons)
    setProgress(current)

    const handleUpdate = () => {
      const updated = getModuleProgress(courseId, moduleId, totalLessons)
      setProgress(updated)
    }

    window.addEventListener('storage', handleUpdate)
    window.addEventListener('courseProgressUpdated', handleUpdate)

    return () => {
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('courseProgressUpdated', handleUpdate)
    }
  }, [courseId, moduleId, totalLessons])

  const isCompleted = totalLessons > 0 && progress.progressPercentage >= 100

  return (
    <span
      className={
        isCompleted
          ? 'bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded'
          : 'bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded'
      }
    >
      {isCompleted ? '✓ Completed' : '✓ Available'}
    </span>
  )
}


