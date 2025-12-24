export type Course = {
  id: string
  title: string
  slug?: string // Persistent URL slug (if not provided, generated from title)
  description?: string
  subtitle?: string // Short tagline/description shown on listing
  priceUSD: number // USD price (0 = free)
  originalPriceUSD?: number // Original price before discount (USD)
  imageUrl?: string
  duration?: string // e.g., "2 hours", "4 weeks"
  level?: 'beginner' | 'intermediate' | 'advanced' | 'all'
  category?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Udemy-style fields
  instructor?: {
    name: string
    title?: string
    imageUrl?: string
  }
  rating?: number // 0-5 rating
  ratingsCount?: number // Number of ratings
  learnersCount?: number // Number of students/learners
  bestseller?: boolean // Bestseller badge
  whatYoullLearn?: string[] // Array of learning outcomes
  languages?: string[] // Available languages
  lastUpdated?: string // Last updated date (e.g., "11/2025")
  lectures?: number // Number of lectures
  totalHours?: string // Total hours (e.g., "62 total hours")
  premium?: boolean // Premium course badge
  couponCode?: string // Active coupon code
  discountPercent?: number // Discount percentage
  discountExpiry?: string // Discount expiry message (e.g., "8 hours left at this price!")
  discountExpiryDate?: string // ISO date string for countdown timer (e.g., "2025-01-20T23:59:59Z")
}

export type CoursePurchase = {
  id: string
  courseId: string
  userId?: string // If user is logged in
  email: string
  amountUSD: number
  paymentStatus: 'pending' | 'completed' | 'failed'
  paymentMethod?: string
  transactionId?: string
  purchasedAt: string
  accessGranted: boolean
  tempPassword?: string // Temporary password stored until email is sent (removed after sending)
}

export type CourseDiscount = {
  id: string
  courseId: string
  type: 'percentage' | 'fixed'
  value: number // percentage (0-100) or fixed amount
  startDate?: string // ISO date string
  endDate?: string // ISO date string
  isActive: boolean
  createdAt: string
}

export type CourseCatalog = {
  courses: Course[]
  discounts: CourseDiscount[]
  coursesDiscountBannerEnabled?: boolean // Enable/disable the courses discount banner
  coursesDiscountBannerCourseId?: string // Course ID to show in the banner (if not set, shows first course with active discount)
}

