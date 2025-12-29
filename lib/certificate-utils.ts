/**
 * Certificate Utilities
 * Handles certificate generation and tracking
 */

export interface CertificateData {
  courseId: string
  studentName: string
  studentEmail: string
  completionDate: string
  certificateId: string
  courseTitle: string
}

const CERTIFICATE_STORAGE_PREFIX = 'certificate_'

/**
 * Generate a unique certificate ID
 */
export function generateCertificateId(courseId: string, email: string): string {
  const timestamp = Date.now()
  const hash = `${courseId}-${email}-${timestamp}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
  return `LD-${hash.toUpperCase()}`
}

/**
 * Store certificate data
 */
export function saveCertificate(certificate: CertificateData): void {
  if (typeof window === 'undefined') return

  try {
    const key = `${CERTIFICATE_STORAGE_PREFIX}${certificate.courseId}_${certificate.studentEmail}`
    localStorage.setItem(key, JSON.stringify(certificate))
    
    // Also store in a list for easy retrieval
    const allCertificates = getAllCertificates()
    const existingIndex = allCertificates.findIndex(
      c => c.courseId === certificate.courseId && c.studentEmail === certificate.studentEmail
    )
    
    if (existingIndex >= 0) {
      allCertificates[existingIndex] = certificate
    } else {
      allCertificates.push(certificate)
    }
    
    localStorage.setItem('all_certificates', JSON.stringify(allCertificates))
  } catch (error) {
    console.error('Error saving certificate:', error)
  }
}

/**
 * Get certificate for a course and student
 */
export function getCertificate(courseId: string, email: string): CertificateData | null {
  if (typeof window === 'undefined') return null

  try {
    const key = `${CERTIFICATE_STORAGE_PREFIX}${courseId}_${email}`
    const stored = localStorage.getItem(key)
    if (!stored) return null
    
    return JSON.parse(stored) as CertificateData
  } catch (error) {
    console.error('Error loading certificate:', error)
    return null
  }
}

/**
 * Get all certificates for a student
 */
export function getAllCertificates(): CertificateData[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem('all_certificates')
    if (!stored) return []
    
    return JSON.parse(stored) as CertificateData[]
  } catch (error) {
    console.error('Error loading certificates:', error)
    return []
  }
}

/**
 * Check if course is complete (all lessons completed)
 */
export function isCourseComplete(
  courseId: string,
  totalLessons: number
): boolean {
  if (typeof window === 'undefined') return false

  try {
    const progressKey = `course_progress_${courseId}`
    const stored = localStorage.getItem(progressKey)
    if (!stored) return false
    
    const progress = JSON.parse(stored)
    const completedLessons = progress.lessons?.filter((l: any) => l.completed) || []
    
    return completedLessons.length >= totalLessons
  } catch (error) {
    console.error('Error checking course completion:', error)
    return false
  }
}

/**
 * Issue certificate when course is completed
 */
export function issueCertificateIfComplete(
  courseId: string,
  courseTitle: string,
  studentEmail: string,
  totalLessons: number
): CertificateData | null {
  if (!isCourseComplete(courseId, totalLessons)) {
    return null
  }

  // Check if certificate already exists
  const existing = getCertificate(courseId, studentEmail)
  if (existing) {
    return existing
  }

  // Get student name from localStorage
  const studentName = localStorage.getItem(`course_student_name_${courseId}`) || 
                     studentEmail.split('@')[0] || 
                     'Student'

  const certificate: CertificateData = {
    courseId,
    studentName,
    studentEmail,
    completionDate: new Date().toISOString(),
    certificateId: generateCertificateId(courseId, studentEmail),
    courseTitle,
  }

  saveCertificate(certificate)
  return certificate
}





