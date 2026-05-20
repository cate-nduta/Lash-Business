export const BOOKING_NOTICE_DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

export type BookingWindowNoticeConfig = {
  minimumNoticeHours?: number
  minimumNoticeByDay?: Record<string, number | string | null | undefined>
  rescheduleCutoffHours?: number
}

const DEFAULT_MINIMUM_NOTICE_HOURS = 12
const DEFAULT_RESCHEDULE_CUTOFF_HOURS = 12

function getDayOfWeekInNairobi(dateStr: string): number {
  const parsed = new Date(`${dateStr}T12:00:00+03:00`)
  if (Number.isNaN(parsed.getTime())) return 0
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    weekday: 'long',
  })
  const weekdayName = formatter.format(parsed)
  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  }
  return weekdayMap[weekdayName] ?? 0
}

export function getDayKeyFromDateStr(dateStr: string): (typeof BOOKING_NOTICE_DAY_KEYS)[number] {
  return BOOKING_NOTICE_DAY_KEYS[getDayOfWeekInNairobi(dateStr)]
}

export function getMinimumNoticeHours(
  dateStr: string,
  bookingWindow?: BookingWindowNoticeConfig | null,
): number {
  const dayKey = getDayKeyFromDateStr(dateStr)
  const defaultHours = Number(bookingWindow?.minimumNoticeHours)
  const fallbackHours =
    Number.isFinite(defaultHours) && defaultHours >= 0 ? defaultHours : DEFAULT_MINIMUM_NOTICE_HOURS
  const overrideHours = Number(bookingWindow?.minimumNoticeByDay?.[dayKey])
  return Number.isFinite(overrideHours) && overrideHours >= 0 ? overrideHours : fallbackHours
}

export function getRescheduleCutoffHours(bookingWindow?: BookingWindowNoticeConfig | null): number {
  const hours = Number(bookingWindow?.rescheduleCutoffHours)
  return Number.isFinite(hours) && hours >= 0 ? hours : DEFAULT_RESCHEDULE_CUTOFF_HOURS
}

/** True when the slot starts after now + minimum notice for that date. */
export function isSlotAfterMinimumNotice(
  slot: string,
  now: Date,
  bookingWindow?: BookingWindowNoticeConfig | null,
): boolean {
  const slotTime = new Date(slot)
  if (Number.isNaN(slotTime.getTime())) return false
  const dateStr = slot.includes('T') ? slot.split('T')[0] : slot.slice(0, 10)
  const noticeHours = getMinimumNoticeHours(dateStr, bookingWindow)
  const minBookingTime = new Date(now.getTime() + noticeHours * 60 * 60 * 1000)
  return slotTime.getTime() > minBookingTime.getTime()
}

/** True when the client is inside the reschedule cutoff (too close to change online). */
export function isWithinRescheduleCutoff(hoursUntilAppointment: number, cutoffHours: number): boolean {
  return hoursUntilAppointment <= cutoffHours
}
