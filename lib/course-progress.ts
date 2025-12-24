/**
 * Course Progress Tracking Utilities
 * 
 * Tracks user progress through course modules and lessons using localStorage and server sync.
 * Progress is stored both locally (for offline access) and on the server (for persistence across devices).
 */

export interface LessonProgress {
  moduleId: string
  lessonId: string
  completed: boolean
  completedAt?: string
}

export interface ModuleProgress {
  moduleId: string
  completedLessons: string[]
  progressPercentage: number
}

export interface CourseProgress {
  courseId: string
  lessons: LessonProgress[]
  lastUpdated: string
}

const STORAGE_KEY_PREFIX = 'course_progress_'
const SYNC_DEBOUNCE_MS = 1000 // Wait 1 second before syncing to server
let syncTimeout: NodeJS.Timeout | null = null

/**
 * Get storage key for a specific course
 */
function getStorageKey(courseId: string): string {
  return `${STORAGE_KEY_PREFIX}${courseId}`
}

/**
 * Load progress for a course from localStorage
 */
export function loadCourseProgress(courseId: string): CourseProgress | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(getStorageKey(courseId))
    if (!stored) return null
    
    return JSON.parse(stored) as CourseProgress
  } catch (error) {
    console.error('Error loading course progress:', error)
    return null
  }
}

/**
 * Save progress for a course to localStorage
 */
export function saveCourseProgress(courseId: string, progress: CourseProgress): void {
  if (typeof window === 'undefined') return

  try {
    progress.lastUpdated = new Date().toISOString()
    localStorage.setItem(getStorageKey(courseId), JSON.stringify(progress))
  } catch (error) {
    console.error('Error saving course progress:', error)
  }
}

/**
 * Mark a lesson as completed (with server sync)
 */
export function markLessonComplete(
  courseId: string,
  moduleId: string,
  lessonId: string
): void {
  const progress = loadCourseProgress(courseId) || {
    courseId,
    lessons: [],
    lastUpdated: new Date().toISOString(),
  }

  // Check if lesson is already marked as complete
  const existingIndex = progress.lessons.findIndex(
    (l) => l.moduleId === moduleId && l.lessonId === lessonId
  )

  if (existingIndex >= 0) {
    // Update existing entry
    progress.lessons[existingIndex].completed = true
    progress.lessons[existingIndex].completedAt = new Date().toISOString()
  } else {
    // Add new entry
    progress.lessons.push({
      moduleId,
      lessonId,
      completed: true,
      completedAt: new Date().toISOString(),
    })
  }

  saveCourseProgress(courseId, progress)
  
  // Sync to server (async, non-blocking)
  syncProgressToServer(courseId, progress).catch((error) => {
    console.warn('Error syncing progress to server:', error)
  })
  
  // Also sync immediately for lesson completion
  const email = getUserEmail()
  if (email) {
    fetch('/api/courses/progress', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courseId,
        email,
        moduleId,
        lessonId,
        completed: true,
      }),
    }).catch((error) => {
      console.warn('Error syncing lesson completion to server:', error)
    })
  }
}

/**
 * Mark a lesson as incomplete (with server sync)
 */
export function markLessonIncomplete(
  courseId: string,
  moduleId: string,
  lessonId: string
): void {
  const progress = loadCourseProgress(courseId)
  if (!progress) return

  const index = progress.lessons.findIndex(
    (l) => l.moduleId === moduleId && l.lessonId === lessonId
  )

  if (index >= 0) {
    progress.lessons[index].completed = false
    delete progress.lessons[index].completedAt
    saveCourseProgress(courseId, progress)
    
    // Sync to server
    syncProgressToServer(courseId, progress).catch((error) => {
      console.warn('Error syncing progress to server:', error)
    })
    
    // Also sync immediately (async, non-blocking)
    getUserId().then(userId => {
      const email = userId ? null : getUserEmail()
      
      if (userId || email) {
        fetch('/api/courses/progress', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId,
            email: email || undefined,
            moduleId,
            lessonId,
            completed: false,
          }),
        }).catch((error) => {
          console.warn('Error syncing lesson incompletion to server:', error)
        })
      }
    }).catch(() => {
      // Ignore errors
    })
  }
}

/**
 * Check if a lesson is completed
 */
export function isLessonCompleted(
  courseId: string,
  moduleId: string,
  lessonId: string
): boolean {
  const progress = loadCourseProgress(courseId)
  if (!progress) return false

  const lesson = progress.lessons.find(
    (l) => l.moduleId === moduleId && l.lessonId === lessonId && l.completed
  )

  return !!lesson
}

/**
 * Get progress for a specific module
 */
export function getModuleProgress(
  courseId: string,
  moduleId: string,
  totalLessons: number
): ModuleProgress {
  const progress = loadCourseProgress(courseId)
  if (!progress || totalLessons === 0) {
    return {
      moduleId,
      completedLessons: [],
      progressPercentage: 0,
    }
  }

  const completedLessons = progress.lessons
    .filter((l) => l.moduleId === moduleId && l.completed)
    .map((l) => l.lessonId)

  const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100)

  return {
    moduleId,
    completedLessons,
    progressPercentage,
  }
}

/**
 * Get overall course progress
 */
export function getCourseProgress(
  courseId: string,
  totalModules: number,
  totalLessons: number
): { completedModules: number; completedLessons: number; progressPercentage: number } {
  const progress = loadCourseProgress(courseId)
  if (!progress || totalLessons === 0) {
    return {
      completedModules: 0,
      completedLessons: 0,
      progressPercentage: 0,
    }
  }

  const completedLessons = progress.lessons.filter((l) => l.completed).length
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100)

  // Calculate completed modules (a module is complete if all its lessons are complete)
  // This would require module structure, so for now we'll just return lesson progress
  return {
    completedModules: 0, // Would need module structure to calculate
    completedLessons,
    progressPercentage,
  }
}

/**
 * Clear all progress for a course
 */
export function clearCourseProgress(courseId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getStorageKey(courseId))
}

/**
 * Get user email from localStorage (used for server sync)
 */
function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('courseAccessEmail')
}

/**
 * Get userId from API (if user is logged in)
 */
async function getUserId(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const response = await fetch('/api/client/auth/me')
    if (response.ok) {
      const data = await response.json()
      return data.user?.id || null
    }
  } catch (error) {
    // Not logged in or error - that's okay
  }
  return null
}

/**
 * Sync progress to server (debounced)
 */
async function syncProgressToServer(
  courseId: string,
  progress: CourseProgress
): Promise<void> {
  if (typeof window === 'undefined') return

  // Try to get userId first (if logged in)
  const userId = await getUserId()
  const email = userId ? null : getUserEmail() // Only use email if not logged in
  
  if (!userId && !email) {
    // No userId or email means user hasn't purchased/accessed course yet
    // Progress will be synced once they provide email or log in
    return
  }

  // Clear existing timeout
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }

  // Debounce server sync
  syncTimeout = setTimeout(async () => {
    try {
      const response = await fetch('/api/courses/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          email: email || undefined,
          lessons: progress.lessons,
        }),
      })

      if (!response.ok) {
        console.warn('Failed to sync progress to server:', response.status)
        // Don't throw - localStorage still has the progress
      }
    } catch (error) {
      console.warn('Error syncing progress to server:', error)
      // Don't throw - localStorage still has the progress
    }
  }, SYNC_DEBOUNCE_MS)
}

/**
 * Load progress from server and merge with localStorage
 */
export async function loadProgressFromServer(
  courseId: string
): Promise<CourseProgress | null> {
  if (typeof window === 'undefined') return null

  // Try to get userId first (if logged in)
  const userId = await getUserId()
  const email = userId ? null : getUserEmail() // Only use email if not logged in
  
  if (!userId && !email) {
    // No userId or email - just use localStorage
    return loadCourseProgress(courseId)
  }

  try {
    const url = userId
      ? `/api/courses/progress?courseId=${encodeURIComponent(courseId)}`
      : `/api/courses/progress?courseId=${encodeURIComponent(courseId)}&email=${encodeURIComponent(email!)}`
    const response = await fetch(url)

    if (response.ok) {
      const serverProgress = await response.json()
      
      // Merge with localStorage (server takes precedence)
      const localProgress = loadCourseProgress(courseId)
      
      if (localProgress && localProgress.lastUpdated > serverProgress.lastUpdated) {
        // Local is newer - merge and sync to server
        const mergedProgress: CourseProgress = {
          courseId,
          lessons: [...serverProgress.lessons],
          lastUpdated: localProgress.lastUpdated,
        }

        // Add any lessons from local that aren't in server
        localProgress.lessons.forEach((localLesson) => {
          const exists = mergedProgress.lessons.some(
            (l) => l.moduleId === localLesson.moduleId && l.lessonId === localLesson.lessonId
          )
          if (!exists) {
            mergedProgress.lessons.push(localLesson)
          }
        })

        // Update localStorage
        saveCourseProgress(courseId, mergedProgress)
        
        // Sync merged progress to server
        await syncProgressToServer(courseId, mergedProgress)
        
        return mergedProgress
      }

      // Server is newer or same - update localStorage
      const progress: CourseProgress = {
        courseId: serverProgress.courseId,
        lessons: serverProgress.lessons || [],
        lastUpdated: serverProgress.lastUpdated || new Date().toISOString(),
      }
      saveCourseProgress(courseId, progress)
      return progress
    } else if (response.status === 403) {
      // Access denied - user hasn't purchased course
      // Still return localStorage progress if available
      return loadCourseProgress(courseId)
    }
  } catch (error) {
    console.warn('Error loading progress from server:', error)
    // Fallback to localStorage
  }

  return loadCourseProgress(courseId)
}

/**
 * Mark a lesson as completed (with server sync)
 */
export async function markLessonCompleteWithSync(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<void> {
  // Update localStorage immediately
  markLessonComplete(courseId, moduleId, lessonId)
  
  // Sync to server
  const progress = loadCourseProgress(courseId)
  if (progress) {
    const email = getUserEmail()
    if (email) {
      // Sync immediately for lesson completion
      try {
        await fetch('/api/courses/progress', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId,
            email,
            moduleId,
            lessonId,
            completed: true,
          }),
        })
      } catch (error) {
        console.warn('Error syncing lesson completion to server:', error)
      }
    }
  }
}

/**
 * Mark a lesson as incomplete (with server sync)
 */
export async function markLessonIncompleteWithSync(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<void> {
  // Update localStorage immediately
  markLessonIncomplete(courseId, moduleId, lessonId)
  
  // Sync to server
  const userId = await getUserId()
  const email = userId ? null : getUserEmail()
  
  if (userId || email) {
    try {
      await fetch('/api/courses/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          email: email || undefined,
          moduleId,
          lessonId,
          completed: false,
        }),
      })
    } catch (error) {
      console.warn('Error syncing lesson incompletion to server:', error)
    }
  }
}

