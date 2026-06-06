import crypto from 'crypto'
import type {
  TrainingFormat,
  TrainingIntake,
  TrainingIntakeStatus,
  TrainingProgram,
} from '@/types/training'

const NAIROBI_TZ = 'Africa/Nairobi'
const DEFAULT_TRAINING_DURATION_DAYS = 5

export function getTrainingDurationDays(program?: Pick<TrainingProgram, 'durationDays'> | null): number {
  const duration = Number(program?.durationDays)
  return Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : DEFAULT_TRAINING_DURATION_DAYS
}

export function formatTrainingDurationLabel(days: number): string {
  return `${days}-day`
}

/** Parse YYYY-MM-DD as noon Nairobi to avoid DST/weekday drift */
export function parseTrainingDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00+03:00`)
}

export function formatTrainingDate(dateStr: string): string {
  const d = parseTrainingDate(dateStr)
  return new Intl.DateTimeFormat('en-KE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: NAIROBI_TZ,
  }).format(d)
}

export function formatTrainingDateRange(dates: string[]): string {
  if (dates.length === 0) return ''
  if (dates.length === 1) return formatTrainingDate(dates[0])
  return `${formatTrainingDate(dates[0])} – ${formatTrainingDate(dates[dates.length - 1])}`
}

function toDateString(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NAIROBI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${day}`
}

function addDays(dateStr: string, days: number): string {
  const d = parseTrainingDate(dateStr)
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

function isWeekend(dateStr: string): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: NAIROBI_TZ,
  }).format(parseTrainingDate(dateStr))
  return weekday === 'Sat' || weekday === 'Sun'
}

/** Monday of the week containing anchor, or anchor if already Monday */
export function getMondayOfWeek(anchorDate: string): string {
  const d = parseTrainingDate(anchorDate)
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: NAIROBI_TZ,
  }).format(d)
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }
  const offset = map[weekday] ?? 0
  if (offset === 0) return anchorDate
  return addDays(anchorDate, -offset)
}

/** Next Saturday on or after anchor */
export function getSaturdayOnOrAfter(anchorDate: string): string {
  const d = parseTrainingDate(anchorDate)
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: NAIROBI_TZ,
  }).format(d)
  const map: Record<string, number> = {
    Sun: 6,
    Mon: 5,
    Tue: 4,
    Wed: 3,
    Thu: 2,
    Fri: 1,
    Sat: 0,
  }
  const daysUntilSat = map[weekday] ?? 0
  return addDays(anchorDate, daysUntilSat)
}

/**
 * Weekday mastery: consecutive weekdays from the Monday of the anchor week.
 */
export function generateWeekdayTrainingDates(anchorDate: string, durationDays = DEFAULT_TRAINING_DURATION_DAYS): string[] {
  const monday = getMondayOfWeek(anchorDate)
  const days = Math.max(1, Math.floor(durationDays))
  const dates: string[] = []
  let offset = 0

  while (dates.length < days) {
    const date = addDays(monday, offset)
    if (!isWeekend(date)) {
      dates.push(date)
    }
    offset += 1
  }

  return dates
}

/**
 * Weekend mastery: Sat/Sun pairs across as many weekends as needed.
 */
export function generateWeekendTrainingDates(anchorDate: string, durationDays = DEFAULT_TRAINING_DURATION_DAYS): string[] {
  const saturday = getSaturdayOnOrAfter(anchorDate)
  const days = Math.max(1, Math.floor(durationDays))
  return Array.from({ length: days }, (_, index) => {
    const weekendIndex = Math.floor(index / 2)
    const dayOffset = index % 2
    return addDays(saturday, weekendIndex * 7 + dayOffset)
  })
}

export function generateTrainingDates(
  format: TrainingFormat,
  anchorDate: string,
  durationDays = DEFAULT_TRAINING_DURATION_DAYS,
): string[] {
  if (format === 'custom') {
    return Array.from({ length: Math.max(1, Math.floor(durationDays)) }, (_, i) =>
      addDays(anchorDate, i),
    )
  }
  if (format === 'weekday') {
    return generateWeekdayTrainingDates(anchorDate, durationDays)
  }
  return generateWeekendTrainingDates(anchorDate, durationDays)
}

export function generateTrainingId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`
}

export function generateTrainingAccessToken(): string {
  return crypto.randomBytes(24).toString('hex')
}

export function getFormatLabel(format: TrainingFormat): string {
  if (format === 'custom') return 'Custom schedule'
  return format === 'weekday' ? 'Weekday Mastery (Mon–Fri)' : 'Weekend Mastery (3 weekends)'
}

export function computeIntakeStatus(
  intake: Pick<TrainingIntake, 'capacity' | 'enrolledCount' | 'status'>,
): TrainingIntakeStatus {
  if (intake.status === 'closed' || intake.status === 'completed') {
    return intake.status
  }
  if (intake.enrolledCount >= intake.capacity) {
    return 'full'
  }
  return intake.status === 'full' ? 'open' : intake.status
}

export function isIntakeEnrollable(intake: TrainingIntake): boolean {
  if (intake.status === 'closed' || intake.status === 'completed') return false
  if (intake.enrolledCount >= intake.capacity) return false
  return intake.status === 'open' || intake.status === 'full'
    ? intake.enrolledCount < intake.capacity
    : false
}

export function hasTrainingCourseMaterial(program?: TrainingProgram | null): boolean {
  if (!program) return false
  if (program.courseMaterialType === 'interactive') {
    return Boolean(program.courseContent)
  }
  return Boolean(program.coursePdfUrl || program.syllabusPreview?.pdfUrl)
}

export function getDefaultProgram(): TrainingProgram {
  const now = new Date().toISOString()
  return {
    id: 'lash-mastery-5day',
    title: '5-Day Lash Mastery Training',
    slug: 'lash-mastery',
    description:
      'In-person 5-day lash mastery program. Learn professional techniques hands-on with live models and expert guidance.',
    shortDescription: 'Master lash artistry in 5 intensive in-person days.',
    eyebrow: 'In-person lash training',
    heroImageUrl: '',
    heroImageAlt: 'Lash training class',
    durationDays: DEFAULT_TRAINING_DURATION_DAYS,
    priceKES: 0,
    currency: 'KES',
    location: 'Nairobi, Kenya',
    requirements: [
      'No prior experience required (beginners welcome)',
      'Arrive on time each training day',
      'Full payment required before classes begin',
    ],
    whatYoullLearn: [
      'Classic and volume lash fundamentals',
      'Sanitation, mapping, and styling',
      'Client consultation and retention',
      'Business setup for lash artists',
    ],
    syllabusPreview: {
      title: 'Preview the syllabus',
      description:
        'Get a quick look at the techniques, theory, and hands-on practice covered during the 5-day mastery.',
      bullets: [
        'Lash health, hygiene, and client consultation',
        'Mapping, styling, isolation, and placement',
        'Retention troubleshooting and aftercare',
      ],
      pdfUrl: '',
      previewImageUrl: '',
      ctaText: 'View syllabus preview',
    },
    imageSections: [],
    galleryImages: [],
    homepageFeature: {
      enabled: true,
      eyebrow: 'New training program',
      title: 'Become a certified lash artist',
      description:
        'Join the in-person 5-day Lash Mastery with weekday and weekend cohorts.',
      imageUrl: '',
      buttonText: 'Explore masterclass',
    },
    courseMaterialType: 'pdf',
    coursePdfUrl: '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
}
