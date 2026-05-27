import { readDataFile } from './data-utils'
import { generateTimeSlotsForDateLocal } from './availability-utils'

export type ModelQuestionType = 'single' | 'multiple' | 'text'

export interface ModelApplicationQuestion {
  id: string
  label: string
  type: ModelQuestionType
  required: boolean
  options: string[]
}

export interface ModelConsentItem {
  id: string
  label: string
}

export interface ModelApplicationFeeSettings {
  enabled: boolean
  amount: number
  currency: string
  noticeText: string
}

export interface ModelApplicationSettings {
  introText: string
  questions: ModelApplicationQuestion[]
  consentItems: ModelConsentItem[]
  feeSettings: ModelApplicationFeeSettings
}

export const MODEL_APPOINTMENT_DURATION_MINUTES = 75

export const DEFAULT_MODEL_APPLICATION_INTRO_TEXT = `I'm currently building my lash portfolio and practicing new lash mapping techniques as part of my ongoing training. I'm offering a limited number of free lash sets to selected models in exchange for photos and videos of the final look.

Because these sets involve practice and filming, the appointment may take longer than a regular session.

Submitting this form does not guarantee a booking. Models will be selected based on availability and how many spots I have open for each model round.`

export const DEFAULT_MODEL_APPLICATION_FEE_SETTINGS: ModelApplicationFeeSettings = {
  enabled: false,
  amount: 0,
  currency: 'KES',
  noticeText:
    'If selected, you will be asked to pay {{amount}} to confirm your model appointment. You only pay after you are selected.',
}

const LEGACY_MODEL_AVAILABILITY_OPTIONS = [
  'Monday (afternoon)',
  'Tuesday (afternoon)',
  'Wednesday (afternoon)',
  'Thursday (afternoon)',
  'Friday (afternoon)',
]

export const DEFAULT_MODEL_APPLICATION_QUESTIONS: ModelApplicationQuestion[] = [
  {
    id: 'availability',
    label: 'Choose one available model slot',
    type: 'single',
    required: true,
    options: [],
  },
  {
    id: 'hasLashExtensions',
    label: 'Have you had lash extensions before?',
    type: 'single',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'hasAppointmentBefore',
    label: 'Have you been a client at LashDiary before?',
    type: 'single',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'allergies',
    label: 'Do you have any known allergies, sensitivities or eye conditions?',
    type: 'text',
    required: false,
    options: [],
  },
  {
    id: 'comfortableLongSessions',
    label: 'Are you comfortable with long sessions? (3-4 hours)',
    type: 'single',
    required: true,
    options: ['Yes', 'No'],
  },
]

export const DEFAULT_MODEL_CONSENT_ITEMS: ModelConsentItem[] = [
  {
    id: 'freeModelSet',
    label: 'I understand this is a free model set provided for training/content creation.',
  },
  {
    id: 'longSessions',
    label: 'I understand the appointment may take up to 3-4 hours.',
  },
  {
    id: 'photosVideos',
    label: 'I consent to photos/videos of my lashes being used for marketing purposes.',
  },
  {
    id: 'noInfills',
    label: 'I understand infills are not included in this offer.',
  },
  {
    id: 'onTime',
    label: 'I agree to arrive on time; late arrivals may forfeit the appointment.',
  },
  {
    id: 'styleChoice',
    label: 'I understand the lash style will be chosen based on the model call needs.',
  },
]

export function normalizeModelApplicationQuestions(value: unknown): ModelApplicationQuestion[] {
  const rawQuestions = Array.isArray(value) ? value : []
  const questions = rawQuestions
    .map((question: any, index) => {
      const type: ModelQuestionType =
        question?.type === 'multiple' || question?.type === 'text' ? question.type : 'single'
      const label = typeof question?.label === 'string' ? question.label.trim() : ''
      const id =
        typeof question?.id === 'string' && question.id.trim()
          ? question.id.trim()
          : `question-${Date.now()}-${index}`
      const options = Array.isArray(question?.options)
        ? question.options.map((option: unknown) => String(option).trim()).filter(Boolean)
        : []

      if (!label) return null

      const normalizedOptions =
        id === 'availability' &&
        (options.length === 0 ||
          LEGACY_MODEL_AVAILABILITY_OPTIONS.every((option, optionIndex) => options[optionIndex] === option))
          ? []
          : options

      return {
        id,
        label: id === 'availability' && label === 'Availability (Afternoon)' ? 'Choose one available model slot' : label,
        type: id === 'availability' ? 'single' : type,
        required: id === 'availability' ? true : question?.required !== false,
        options: type === 'text' && id !== 'availability' ? [] : normalizedOptions,
      }
    })
    .filter(Boolean) as ModelApplicationQuestion[]

  return questions.length > 0 ? questions : DEFAULT_MODEL_APPLICATION_QUESTIONS
}

export function normalizeModelApplicationIntroText(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return DEFAULT_MODEL_APPLICATION_INTRO_TEXT
}

export function normalizeModelApplicationFeeSettings(value: unknown): ModelApplicationFeeSettings {
  const settings = value && typeof value === 'object' ? (value as Partial<ModelApplicationFeeSettings>) : {}
  const amount = Number(settings.amount)
  const currency =
    typeof settings.currency === 'string' && settings.currency.trim()
      ? settings.currency.trim().toUpperCase()
      : DEFAULT_MODEL_APPLICATION_FEE_SETTINGS.currency
  const noticeText =
    typeof settings.noticeText === 'string' && settings.noticeText.trim()
      ? settings.noticeText.trim()
      : DEFAULT_MODEL_APPLICATION_FEE_SETTINGS.noticeText

  return {
    enabled: settings.enabled === true,
    amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0,
    currency,
    noticeText,
  }
}

export function getModelApplicationAnswerValues(answer: unknown): string[] {
  if (Array.isArray(answer)) {
    return answer.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof answer === 'string') {
    const trimmed = answer.trim()
    return trimmed ? [trimmed] : []
  }

  return []
}

export function parseModelAvailabilitySlot(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value.trim())
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getModelApplicationAvailabilityValues(application: {
  availability?: unknown
  customAnswers?: Record<string, unknown>
}): string[] {
  const customAvailability = application.customAnswers?.availability
  const customValues = getModelApplicationAnswerValues(customAvailability)
  if (customValues.length > 0) return customValues

  return getModelApplicationAnswerValues(application.availability)
}

type BusyInterval = {
  startMs: number
  endMs: number
}

function getInterval(start: Date, durationMinutes = MODEL_APPOINTMENT_DURATION_MINUTES): BusyInterval {
  const startMs = start.getTime()
  return {
    startMs,
    endMs: startMs + durationMinutes * 60 * 1000,
  }
}

export function intervalsOverlap(a: BusyInterval, b: BusyInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs
}

export function getBookingDurationMinutes(booking: any): number {
  if (typeof booking?.totalDurationMinutes === 'number' && booking.totalDurationMinutes > 0) {
    return booking.totalDurationMinutes
  }

  if (Array.isArray(booking?.serviceDetails) && booking.serviceDetails.length > 0) {
    const minutes = booking.serviceDetails.reduce((sum: number, service: any) => {
      const duration = typeof service?.duration === 'number' ? service.duration : 0
      return sum + Math.max(duration, 0)
    }, 0)
    if (minutes > 0) return minutes
  }

  if (typeof booking?.totalDuration === 'number' && booking.totalDuration > 0) {
    return booking.totalDuration * 60
  }

  return MODEL_APPOINTMENT_DURATION_MINUTES
}

export async function loadModelApplicationBusyIntervals(): Promise<BusyInterval[]> {
  const data = await readDataFile<{ applications: Array<{ status?: string; availability?: unknown; customAnswers?: Record<string, unknown> }> }>(
    'model-applications.json',
    { applications: [] }
  )

  return data.applications
    .filter((application) => application.status !== 'rejected')
    .flatMap((application) => getModelApplicationAvailabilityValues(application))
    .map(parseModelAvailabilitySlot)
    .filter((date): date is Date => Boolean(date))
    .map((date) => getInterval(date))
}

export async function loadBookingBusyIntervals(options: { excludeBookingReference?: string } = {}): Promise<BusyInterval[]> {
  const [bookingsData, reservations] = await Promise.all([
    readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] }),
    readDataFile<Array<{ timeSlot?: string; expiresAt?: string }>>('pending-booking-reservations.json', []),
  ])

  const now = Date.now()
  const bookingIntervals = (bookingsData.bookings || [])
    .filter((booking) => booking?.timeSlot && booking.status !== 'cancelled')
    .map((booking) => {
      const start = new Date(booking.timeSlot)
      if (Number.isNaN(start.getTime())) return null
      return getInterval(start, getBookingDurationMinutes(booking))
    })
    .filter((interval): interval is BusyInterval => Boolean(interval))

  const reservationIntervals = reservations
    .filter(
      (reservation: any) =>
        reservation?.timeSlot &&
        reservation.bookingReference !== options.excludeBookingReference &&
        (!reservation.expiresAt || new Date(reservation.expiresAt).getTime() > now)
    )
    .map((reservation: any) => {
      const start = new Date(reservation.timeSlot as string)
      if (Number.isNaN(start.getTime())) return null
      const durationMinutes =
        typeof reservation?.totalDurationMinutes === 'number' && reservation.totalDurationMinutes > 0
          ? reservation.totalDurationMinutes
          : MODEL_APPOINTMENT_DURATION_MINUTES
      return getInterval(start, durationMinutes)
    })
    .filter((interval): interval is BusyInterval => Boolean(interval))

  return [...bookingIntervals, ...reservationIntervals]
}

export function hasAppointmentConflict(
  start: Date,
  durationMinutes: number,
  busyIntervals: BusyInterval[],
): boolean {
  const requestedInterval = getInterval(start, durationMinutes)
  return busyIntervals.some((busyInterval) => intervalsOverlap(requestedInterval, busyInterval))
}

function parseDateOnly(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const parsed = new Date(`${dateStr}T00:00:00+03:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export async function loadAvailableModelAvailabilityOptions(limit = 8): Promise<string[]> {
  const [availability, modelBusyIntervals, bookingBusyIntervals] = await Promise.all([
    readDataFile<any>('availability.json', {}),
    loadModelApplicationBusyIntervals(),
    loadBookingBusyIntervals(),
  ])
  const busyIntervals = [...modelBusyIntervals, ...bookingBusyIntervals]
  const options: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowStart = parseDateOnly(availability?.bookingWindow?.current?.startDate)
  const windowEnd = parseDateOnly(availability?.bookingWindow?.current?.endDate)
  const currentDate = windowStart && windowStart > today ? new Date(windowStart) : new Date(today)
  const endDate = windowEnd || new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
  const now = new Date()

  while (currentDate <= endDate && options.length < limit) {
    const dateKey = formatDateKey(currentDate)
    const slots = generateTimeSlotsForDateLocal(dateKey, availability)

    for (const slot of slots) {
      const start = new Date(slot)
      if (Number.isNaN(start.getTime()) || start <= now) continue
      if (!hasAppointmentConflict(start, MODEL_APPOINTMENT_DURATION_MINUTES, busyIntervals)) {
        options.push(slot)
        if (options.length >= limit) break
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return options
}

export async function loadReservedModelAvailabilityOptions(): Promise<string[]> {
  const data = await readDataFile<{ applications: Array<{ status?: string; availability?: unknown; customAnswers?: Record<string, unknown> }> }>(
    'model-applications.json',
    { applications: [] }
  )

  return Array.from(
    new Set(
      data.applications
        .filter((application) => application.status !== 'rejected')
        .flatMap((application) => getModelApplicationAvailabilityValues(application))
    )
  )
}

export function normalizeModelConsentItems(value: unknown): ModelConsentItem[] {
  const rawItems = Array.isArray(value) ? value : []
  const items = rawItems
    .map((item: any, index) => {
      const label = typeof item?.label === 'string' ? item.label.trim() : ''
      const id =
        typeof item?.id === 'string' && item.id.trim()
          ? item.id.trim()
          : `consent-${Date.now()}-${index}`

      if (!label) return null

      return { id, label }
    })
    .filter(Boolean) as ModelConsentItem[]

  return items.length > 0 ? items : DEFAULT_MODEL_CONSENT_ITEMS
}

export async function loadModelApplicationSettings(): Promise<ModelApplicationSettings> {
  const settings = await readDataFile<ModelApplicationSettings>('model-application-settings.json', {
    introText: DEFAULT_MODEL_APPLICATION_INTRO_TEXT,
    questions: DEFAULT_MODEL_APPLICATION_QUESTIONS,
    consentItems: DEFAULT_MODEL_CONSENT_ITEMS,
    feeSettings: DEFAULT_MODEL_APPLICATION_FEE_SETTINGS,
  })

  return {
    introText: normalizeModelApplicationIntroText(settings?.introText),
    questions: normalizeModelApplicationQuestions(settings?.questions),
    consentItems: normalizeModelConsentItems(settings?.consentItems),
    feeSettings: normalizeModelApplicationFeeSettings(settings?.feeSettings),
  }
}
