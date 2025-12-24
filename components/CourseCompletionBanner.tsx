'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCertificate, isCourseComplete } from '@/lib/certificate-utils'
import { getCourseSlug } from '@/lib/courses-utils'
import { type Course } from '@/types/course'

interface CourseCompletionBannerProps {
  course: Course
  totalLessons: number
}

export default function CourseCompletionBanner({ course, totalLessons }: CourseCompletionBannerProps) {
  const [isComplete, setIsComplete] = useState(false)
  const [hasCertificate, setHasCertificate] = useState(false)

  useEffect(() => {
    const email = localStorage.getItem('courseAccessEmail')
    if (!email) return

    const complete = isCourseComplete(course.id, totalLessons)
    setIsComplete(complete)

    if (complete) {
      const cert = getCertificate(course.id, email)
      setHasCertificate(!!cert)
    }

    // Listen for progress updates
    const handleProgressUpdate = () => {
      const complete = isCourseComplete(course.id, totalLessons)
      setIsComplete(complete)
      if (complete) {
        const cert = getCertificate(course.id, email)
        setHasCertificate(!!cert)
      }
    }

    window.addEventListener('courseProgressUpdated', handleProgressUpdate)
    return () => window.removeEventListener('courseProgressUpdated', handleProgressUpdate)
  }, [course.id, totalLessons])

  if (!isComplete) return null

  const courseSlug = getCourseSlug(course)

  return (
    <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl">🎓</div>
            <div>
              <h3 className="text-2xl font-bold text-green-800 mb-1">
                Congratulations! Course Completed
              </h3>
              <p className="text-green-700">
                You've successfully completed all lessons in this course!
              </p>
            </div>
          </div>
        </div>
        <Link
          href={`/course/${courseSlug}/certificate`}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors shadow-lg whitespace-nowrap"
        >
          🏆 View Certificate
        </Link>
      </div>
    </div>
  )
}



