'use client'

import { useEffect, useState } from 'react'
import { 
  getModuleProgress, 
  isLessonCompleted,
  markLessonComplete,
  markLessonIncomplete,
  type ModuleProgress 
} from '@/lib/course-progress'

interface CourseProgressTrackerProps {
  courseId: string
  moduleId: string
  totalLessons: number
  onProgressUpdate?: (progress: ModuleProgress) => void
}

export default function CourseProgressTracker({
  courseId,
  moduleId,
  totalLessons,
  onProgressUpdate,
}: CourseProgressTrackerProps) {
  // Always start with 0% to match server-side rendering (prevents hydration mismatch)
  const [progress, setProgress] = useState<ModuleProgress>({
    moduleId,
    completedLessons: [],
    progressPercentage: 0,
  })

  useEffect(() => {
    // Only read from localStorage on client-side after mount
    const currentProgress = getModuleProgress(courseId, moduleId, totalLessons)
    setProgress(currentProgress)
    onProgressUpdate?.(currentProgress)
  }, [courseId, moduleId, totalLessons, onProgressUpdate])

  // Listen for progress updates from other components
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedProgress = getModuleProgress(courseId, moduleId, totalLessons)
      setProgress(updatedProgress)
      onProgressUpdate?.(updatedProgress)
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events (for same-tab updates)
    window.addEventListener('courseProgressUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('courseProgressUpdated', handleStorageChange)
    }
  }, [courseId, moduleId, totalLessons, onProgressUpdate])

  return null // This component doesn't render anything, it just manages state
}

/**
 * Hook to check if a lesson is completed
 */
export function useLessonProgress(courseId: string, moduleId: string, lessonId: string) {
  // Always start with false to match server-side rendering (prevents hydration mismatch)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    // Only read from localStorage on client-side after mount
    setIsCompleted(isLessonCompleted(courseId, moduleId, lessonId))
    
    const handleUpdate = () => {
      setIsCompleted(isLessonCompleted(courseId, moduleId, lessonId))
    }

    window.addEventListener('storage', handleUpdate)
    window.addEventListener('courseProgressUpdated', handleUpdate)

    return () => {
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('courseProgressUpdated', handleUpdate)
    }
  }, [courseId, moduleId, lessonId])

  const toggleComplete = () => {
    if (isCompleted) {
      markLessonIncomplete(courseId, moduleId, lessonId)
    } else {
      markLessonComplete(courseId, moduleId, lessonId)
    }
    
    // Dispatch custom event to update other components
    window.dispatchEvent(new Event('courseProgressUpdated'))
    setIsCompleted(!isCompleted)
  }

  return { isCompleted, toggleComplete }
}

