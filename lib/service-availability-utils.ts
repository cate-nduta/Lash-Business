export const WEEKDAY_OPTIONS = [
  { key: 'sunday', label: 'Sunday', shortLabel: 'Sun' },
  { key: 'monday', label: 'Monday', shortLabel: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', shortLabel: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', shortLabel: 'Wed' },
  { key: 'thursday', label: 'Thursday', shortLabel: 'Thu' },
  { key: 'friday', label: 'Friday', shortLabel: 'Fri' },
  { key: 'saturday', label: 'Saturday', shortLabel: 'Sat' },
] as const

export type WeekdayKey = (typeof WEEKDAY_OPTIONS)[number]['key']

const WEEKDAY_KEYS = new Set<string>(WEEKDAY_OPTIONS.map((day) => day.key))

export function normalizeAvailableDays(value: unknown): WeekdayKey[] {
  if (!Array.isArray(value)) return []

  const unique = new Set<WeekdayKey>()
  value.forEach((entry) => {
    if (typeof entry !== 'string') return
    const normalized = entry.trim().toLowerCase()
    if (WEEKDAY_KEYS.has(normalized)) {
      unique.add(normalized as WeekdayKey)
    }
  })

  return WEEKDAY_OPTIONS.map((day) => day.key).filter((day) => unique.has(day))
}

export function getWeekdayKeyFromDate(dateValue: string): WeekdayKey | null {
  if (!dateValue) return null
  const date = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return WEEKDAY_OPTIONS[date.getDay()]?.key ?? null
}

export function isAvailableOnSelectedDate(availableDays: WeekdayKey[] | undefined, selectedDate: string) {
  if (!availableDays || availableDays.length === 0) return true
  const selectedDay = getWeekdayKeyFromDate(selectedDate)
  if (!selectedDay) return false
  return availableDays.includes(selectedDay)
}

export function formatAvailableDays(days: WeekdayKey[] | undefined) {
  if (!days || days.length === 0) return 'Any available day'

  const labels = days
    .map((day) => WEEKDAY_OPTIONS.find((option) => option.key === day)?.label)
    .filter(Boolean) as string[]

  if (labels.length === 1) return `${labels[0]}s only`
  if (labels.length === 2) return `${labels[0]}s and ${labels[1]}s only`

  const last = labels[labels.length - 1]
  return `${labels.slice(0, -1).map((label) => `${label}s`).join(', ')}, and ${last}s only`
}

export function formatCategoryAvailabilityNote(days: WeekdayKey[] | undefined) {
  if (!days || days.length === 0) return ''
  return `This service category can only be booked on ${formatAvailableDays(days).toLowerCase()}.`
}
