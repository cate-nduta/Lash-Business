export const BOOKING_DRAFT_KEY = 'lashBookingDraft'
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export type BookingFormDraft = {
  name: string
  email: string
  phone: string
  service: string
  lastFullSetDate: string
  date: string
  timeSlot: string
  notes: string
  appointmentPreference: string
  visitType: 'studio' | 'home'
  homeCallLocationId: string
  residentialArea: string
  homeAddressDetails: string
}

export type BookingDraft = {
  formData: BookingFormDraft
  phoneCountryCode: string
  phoneLocalNumber: string
  promoCode: string
  savedAt: string
}

export function loadBookingDraft(): BookingDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(BOOKING_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BookingDraft
    if (!parsed?.formData || !parsed.savedAt) return null
    const age = Date.now() - new Date(parsed.savedAt).getTime()
    if (!Number.isFinite(age) || age > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(BOOKING_DRAFT_KEY)
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem(BOOKING_DRAFT_KEY)
    return null
  }
}

export function saveBookingDraft(draft: BookingDraft): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft))
  } catch (error) {
    console.warn('Could not save booking draft:', error)
  }
}

export function clearBookingDraft(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(BOOKING_DRAFT_KEY)
  } catch {
    // ignore
  }
}
