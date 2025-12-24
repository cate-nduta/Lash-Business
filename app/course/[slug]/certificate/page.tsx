'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CourseCertificate from '@/components/CourseCertificate'
import { getCertificate, isCourseComplete } from '@/lib/certificate-utils'
import { getCourseSlug } from '@/lib/courses-utils'
import { type Course } from '@/types/course'

export default function CertificatePage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [certificate, setCertificate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCertificate = async () => {
      try {
        const slug = decodeURIComponent(params.slug as string)
        
        // Load course from API
        const response = await fetch('/api/courses')
        if (!response.ok) {
          setError('Failed to load course')
          setLoading(false)
          return
        }

        const data = await response.json()
        const courses: Course[] = data.courses || []
        
        const { findCourseBySlugOrId, getCourseSlug: getSlug } = await import('@/lib/courses-utils')
        const courseData = courses.find(c => {
          const courseSlug = getSlug(c)
          return courseSlug.toLowerCase().trim() === slug.toLowerCase().trim() || c.id === slug
        })
        
        if (!courseData) {
          setError('Course not found')
          setLoading(false)
          return
        }

        setCourse(courseData)

        // Get student email and name
        const email = localStorage.getItem('courseAccessEmail')
        if (!email) {
          setError('Please access the course first to view your certificate')
          setLoading(false)
          return
        }

        const studentName = localStorage.getItem(`course_student_name_${courseData.id}`) || 
                           email.split('@')[0] || 
                           'Student'

        // Get total lessons count from course structure
        const { courseStructure } = await import('@/lib/course-structure')
        const totalLessons = courseStructure.reduce((sum, module) => sum + module.lessons.length, 0)
        
        if (!isCourseComplete(courseData.id, totalLessons)) {
          setError('Course not yet completed. Complete all lessons to receive your certificate.')
          setLoading(false)
          return
        }

        // Get or create certificate
        let cert = getCertificate(courseData.id, email)
        
        if (!cert) {
          // Create certificate
          const { issueCertificateIfComplete } = await import('@/lib/certificate-utils')
          cert = issueCertificateIfComplete(
            courseData.id,
            courseData.title,
            email,
            totalLessons
          )
        }

        if (cert) {
          setCertificate(cert)
        } else {
          setError('Unable to generate certificate')
        }
      } catch (error) {
        console.error('Error loading certificate:', error)
        setError('Failed to load certificate')
      } finally {
        setLoading(false)
      }
    }

    loadCertificate()
  }, [params.slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading certificate...</div>
      </div>
    )
  }

  if (error || !course || !certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Certificate Not Available</h1>
          <p className="text-gray-600 mb-6">{error || 'Certificate not found'}</p>
          <button
            onClick={() => router.push(`/course/${getCourseSlug(course || { title: '', id: '' } as Course)}`)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Course
          </button>
        </div>
      </div>
    )
  }

  return (
    <CourseCertificate
      course={course}
      studentName={certificate.studentName}
      completionDate={certificate.completionDate}
      certificateId={certificate.certificateId}
    />
  )
}

