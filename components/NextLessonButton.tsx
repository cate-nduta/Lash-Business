'use client'

import Link from 'next/link'
import { markLessonComplete } from '@/lib/course-progress'

interface NextLessonButtonProps {
  courseId: string
  moduleId: string
  lessonId: string
  href: string
  children: React.ReactNode
  className?: string
}

export default function NextLessonButton({
  courseId,
  moduleId,
  lessonId,
  href,
  children,
  className = '',
}: NextLessonButtonProps) {
  const handleClick = async () => {
    // Mark lesson as complete when they click Next
    markLessonComplete(courseId, moduleId, lessonId)
    
    // Dispatch events to update UI
    window.dispatchEvent(new Event('courseProgressUpdated'))
    window.dispatchEvent(new CustomEvent('lessonProgressChanged', { 
      detail: { courseId, moduleId, lessonId, completed: true }
    }))

    // Check if course is complete and issue certificate
    try {
      const { courseStructure } = await import('@/lib/course-structure')
      const totalLessons = courseStructure.reduce((sum, module) => sum + module.lessons.length, 0)
      const { isCourseComplete, issueCertificateIfComplete } = await import('@/lib/certificate-utils')
      
      if (isCourseComplete(courseId, totalLessons)) {
        const email = localStorage.getItem('courseAccessEmail')
        if (email) {
          // Get course title
          const response = await fetch('/api/courses')
          if (response.ok) {
            const data = await response.json()
            const course = data.courses?.find((c: any) => c.id === courseId)
            if (course) {
              issueCertificateIfComplete(courseId, course.title, email, totalLessons)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking course completion:', error)
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
    >
      {children}
    </Link>
  )
}

