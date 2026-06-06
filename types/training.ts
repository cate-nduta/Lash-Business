export type TrainingFormat = 'weekday' | 'weekend' | 'custom'

export type TrainingIntakeStatus = 'open' | 'full' | 'closed' | 'completed'
export type TrainingStarterKitOption = 'with_starter_kit' | 'without_starter_kit'

export type TrainingEnrollmentPaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'manual'

export type TrainingCourseSection = {
  heading: string
  content: string[]
}

export type TrainingCourseModule = {
  id: number
  day: string
  title: string
  color: string
  intro: string
  sections: TrainingCourseSection[]
  outcome: string
}

export type TrainingCourseContent = {
  title: string
  subtitle: string
  price: string
  tagline: string
  philosophy: string
  modules: TrainingCourseModule[]
  practicalAssessment: {
    title: string
    description: string
    components: string[]
  }
  certificate: string
}

export type TrainingProgram = {
  id: string
  title: string
  slug: string
  description: string
  shortDescription?: string
  eyebrow?: string
  heroImageUrl?: string
  heroImageAlt?: string
  durationDays?: number
  priceKES: number
  currency: 'KES'
  location: string
  requirements?: string[]
  whatYoullLearn?: string[]
  syllabusPreview?: {
    title?: string
    description?: string
    bullets?: string[]
    pdfUrl?: string
    previewImageUrl?: string
    ctaText?: string
  }
  imageSections?: Array<{
    id: string
    title: string
    description?: string
    imageUrl: string
    imageAlt?: string
  }>
  galleryImages?: Array<{
    id: string
    imageUrl: string
    imageAlt?: string
    caption?: string
  }>
  homepageFeature?: {
    enabled: boolean
    eyebrow?: string
    title?: string
    description?: string
    imageUrl?: string
    buttonText?: string
  }
  courseMaterialType?: 'pdf' | 'interactive'
  coursePdfUrl?: string
  courseContent?: TrainingCourseContent
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type TrainingIntake = {
  id: string
  programId: string
  title: string
  format: TrainingFormat
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  trainingDates: string[] // YYYY-MM-DD dates for this intake
  durationDays?: number
  priceKES: number
  withoutStarterKitPriceKES?: number
  originalPriceKES?: number
  discountEnabled?: boolean
  capacity: number
  enrolledCount: number
  status: TrainingIntakeStatus
  timingOptions?: string[]
  location?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type TrainingEnrollment = {
  id: string
  intakeId: string
  programId: string
  name: string
  email: string
  phone?: string
  amountKES: number
  selectedTiming?: string
  selectedStarterKitOption?: TrainingStarterKitOption
  paymentStatus: TrainingEnrollmentPaymentStatus
  paymentMethod?: string
  transactionId?: string
  accessToken?: string
  confirmedAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type TrainingProgramsData = {
  programs: TrainingProgram[]
}

export type TrainingIntakesData = {
  intakes: TrainingIntake[]
}

export type TrainingEnrollmentsData = {
  enrollments: TrainingEnrollment[]
}
