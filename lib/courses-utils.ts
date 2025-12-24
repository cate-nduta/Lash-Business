import { type Course, type CourseDiscount, type CourseCatalog } from '@/types/course'

/**
 * Generate a URL-friendly slug from a course title
 */
export const generateCourseSlug = (title: string): string => {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return ''
  }
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  return slug || '' // Ensure we always return a string
}

/**
 * Get the course slug - always generates from current title to keep URLs in sync
 */
export const getCourseSlug = (course: Course): string => {
  return generateCourseSlug(course.title)
}

/**
 * Find a course by slug or ID
 */
export const findCourseBySlugOrId = (
  courses: Course[],
  slugOrId: string
): Course | undefined => {
  // Decode URL-encoded characters
  let decodedSlug = slugOrId
  try {
    decodedSlug = decodeURIComponent(slugOrId)
  } catch (e) {
    decodedSlug = slugOrId
  }
  
  // Normalize the input slug/ID
  const normalizedSlugOrId = decodedSlug.toLowerCase().trim()
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [findCourseBySlugOrId] Looking for:', normalizedSlugOrId)
  }
  
  // First try to find by exact slug match
  for (const course of courses) {
    const courseSlug = getCourseSlug(course).toLowerCase().trim()
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`  Comparing: "${courseSlug}" === "${normalizedSlugOrId}"`, courseSlug === normalizedSlugOrId)
    }
    
    if (courseSlug === normalizedSlugOrId) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`  ✅ Found exact match: ${course.id} - ${course.title}`)
      }
      return course
    }
  }
  
  // Fallback: try to find by ID
  const courseById = courses.find((c) => {
    const idMatch = c.id.toLowerCase() === normalizedSlugOrId || c.id === slugOrId
    if (process.env.NODE_ENV === 'development' && idMatch) {
      console.log(`  ✅ Found by ID: ${c.id}`)
    }
    return idMatch
  })
  if (courseById) {
    return courseById
  }
  
  return undefined
}

export const generateCourseId = (prefix: string = 'course') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`
}

export const normalizeCourse = (raw: any): Course => {
  const now = new Date().toISOString()
  
  // Handle priceUSD field
  let priceUSD = 0
  if (typeof raw?.priceUSD === 'number' && raw.priceUSD >= 0) {
    priceUSD = raw.priceUSD
  }
  
  // Preserve instructor object if it exists
  let instructor = undefined
  if (raw?.instructor) {
    instructor = {
      name: typeof raw.instructor.name === 'string' ? raw.instructor.name : '',
      title: typeof raw.instructor.title === 'string' ? raw.instructor.title : undefined,
      imageUrl: typeof raw.instructor.imageUrl === 'string' ? raw.instructor.imageUrl : undefined,
    }
    // Only include instructor if name exists
    if (!instructor.name) {
      instructor = undefined
    }
  }
  
  return {
    id: typeof raw?.id === 'string' && raw.id.trim().length > 0 
      ? raw.id.trim() 
      : generateCourseId('course'),
    title: typeof raw?.title === 'string' && raw.title.trim().length > 0 
      ? raw.title.trim() 
      : 'Untitled Course',
    slug: typeof raw?.title === 'string' && raw.title.trim().length > 0
      ? (() => {
          const slug = generateCourseSlug(raw.title.trim())
          return slug && slug.length > 0 ? slug : undefined
        })()
      : undefined,
    subtitle: typeof raw?.subtitle === 'string' && raw.subtitle.trim().length > 0 ? raw.subtitle.trim() : undefined,
    description: typeof raw?.description === 'string' ? raw.description : undefined,
    priceUSD: priceUSD,
    originalPriceUSD: typeof raw?.originalPriceUSD === 'number' && raw.originalPriceUSD >= 0 ? raw.originalPriceUSD : undefined,
    imageUrl: typeof raw?.imageUrl === 'string' && raw.imageUrl.trim().length > 0 ? raw.imageUrl.trim() : undefined,
    duration: typeof raw?.duration === 'string' ? raw.duration : undefined,
    level: ['beginner', 'intermediate', 'advanced', 'all'].includes(raw?.level) 
      ? raw.level 
      : 'all',
    category: typeof raw?.category === 'string' ? raw.category : undefined,
    isActive: typeof raw?.isActive === 'boolean' ? raw.isActive : true,
    createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: now,
    // Preserve all additional course fields
    instructor: instructor,
    rating: typeof raw?.rating === 'number' && raw.rating >= 0 && raw.rating <= 5 ? raw.rating : undefined,
    ratingsCount: typeof raw?.ratingsCount === 'number' && raw.ratingsCount >= 0 ? raw.ratingsCount : undefined,
    learnersCount: typeof raw?.learnersCount === 'number' && raw.learnersCount >= 0 ? raw.learnersCount : undefined,
    bestseller: typeof raw?.bestseller === 'boolean' ? raw.bestseller : undefined,
    whatYoullLearn: Array.isArray(raw?.whatYoullLearn) && raw.whatYoullLearn.length > 0 
      ? raw.whatYoullLearn.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
      : undefined,
    languages: Array.isArray(raw?.languages) && raw.languages.length > 0
      ? raw.languages.filter((lang: any) => typeof lang === 'string' && lang.trim().length > 0)
      : undefined,
    lastUpdated: typeof raw?.lastUpdated === 'string' ? raw.lastUpdated : undefined,
    lectures: typeof raw?.lectures === 'number' && raw.lectures >= 0 ? raw.lectures : undefined,
    totalHours: typeof raw?.totalHours === 'string' ? raw.totalHours : undefined,
    premium: typeof raw?.premium === 'boolean' ? raw.premium : undefined,
    couponCode: typeof raw?.couponCode === 'string' && raw.couponCode.trim().length > 0 ? raw.couponCode.trim() : undefined,
    discountPercent: typeof raw?.discountPercent === 'number' && raw.discountPercent >= 0 && raw.discountPercent <= 100 
      ? raw.discountPercent 
      : (typeof raw?.discountPercent === 'string' ? (() => {
          const parsed = parseFloat(raw.discountPercent)
          return !isNaN(parsed) && parsed >= 0 && parsed <= 100 ? parsed : undefined
        })() : undefined),
    discountExpiry: typeof raw?.discountExpiry === 'string' ? raw.discountExpiry : undefined,
    discountExpiryDate: typeof raw?.discountExpiryDate === 'string' ? raw.discountExpiryDate : undefined,
  }
}

export const normalizeDiscount = (raw: any): CourseDiscount => {
  const now = new Date().toISOString()
  
  return {
    id: typeof raw?.id === 'string' && raw.id.trim().length > 0 
      ? raw.id.trim() 
      : generateCourseId('discount'),
    courseId: typeof raw?.courseId === 'string' ? raw.courseId : '',
    type: raw?.type === 'fixed' ? 'fixed' : 'percentage',
    value: typeof raw?.value === 'number' && raw.value >= 0 ? raw.value : 0,
    startDate: typeof raw?.startDate === 'string' ? raw.startDate : undefined,
    endDate: typeof raw?.endDate === 'string' ? raw.endDate : undefined,
    isActive: typeof raw?.isActive === 'boolean' ? raw.isActive : true,
    createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : now,
  }
}

export const calculateDiscountedPrice = (
  course: Course,
  discount: CourseDiscount | null
): number => {
  if (!discount || !discount.isActive) {
    return course.priceUSD || 0
  }

  // Check if discount is within date range
  const now = new Date()
  if (discount.startDate && new Date(discount.startDate) > now) {
    return course.priceUSD || 0
  }
  if (discount.endDate && new Date(discount.endDate) < now) {
    return course.priceUSD || 0
  }

  const basePrice = course.priceUSD || 0

  if (discount.type === 'percentage') {
    return Math.max(0, basePrice * (1 - discount.value / 100))
  } else {
    // fixed amount (in USD)
    return Math.max(0, basePrice - discount.value)
  }
}

