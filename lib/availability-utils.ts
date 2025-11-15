import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from './data-utils'

const DEFAULT_DAY_ENABLED: Record<string, boolean> = {
  sunday: true,
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
}

const DEFAULT_WEEKDAY_SLOTS = [
  { hour: 9, minute: 30 },
  { hour: 12, minute: 0 },
  { hour: 14, minute: 30 },
  { hour: 16, minute: 30 },
]

const DEFAULT_SUNDAY_SLOTS = [
  { hour: 12, minute: 30 },
  { hour: 15, minute: 0 },
]

const DEFAULT_SATURDAY_SLOTS = [
  { hour: 12, minute: 30 },
]

function getDayOfWeekValue(year: number, month: number, day: number): number {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const dateInNairobi = new Date(`${dateStr}T12:00:00+03:00`)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    weekday: 'long',
  })
  const weekdayName = formatter.format(dateInNairobi)
  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  }
  return weekdayMap[weekdayName] ?? dateInNairobi.getUTCDay()
}

export function generateTimeSlotsForDateLocal(dateStr: string, availability: any): string[] {
  const slots: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return slots
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  const dayOfWeek = getDayOfWeekValue(year, month, day)
  const isSunday = dayOfWeek === 0
  const isSaturday = dayOfWeek === 6
  const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]

  const businessHours = availability?.businessHours || {}
  const isEnabled =
    typeof businessHours?.[dayKey]?.enabled === 'boolean'
      ? businessHours[dayKey].enabled
      : DEFAULT_DAY_ENABLED[dayKey]

  if (!isEnabled) {
    return slots
  }

  let timeConfig
  if (isSunday) {
    timeConfig =
      (availability?.timeSlots?.sunday && availability.timeSlots.sunday.length > 0
        ? availability.timeSlots.sunday
        : DEFAULT_SUNDAY_SLOTS)
  } else if (isSaturday) {
    timeConfig =
      (availability?.timeSlots?.saturday && availability.timeSlots.saturday.length > 0
        ? availability.timeSlots.saturday
        : availability?.timeSlots?.weekdays && availability.timeSlots.weekdays.length > 0
        ? availability.timeSlots.weekdays
        : DEFAULT_SATURDAY_SLOTS)
  } else {
    // Check for individual day slots first, then fall back to weekdays
    const daySpecificSlots = availability?.timeSlots?.[dayKey as keyof typeof availability.timeSlots]
    timeConfig =
      (Array.isArray(daySpecificSlots) && daySpecificSlots.length > 0
        ? daySpecificSlots
        : undefined) ??
      (availability?.timeSlots?.weekdays && availability.timeSlots.weekdays.length > 0
        ? availability.timeSlots.weekdays
        : DEFAULT_WEEKDAY_SLOTS)
  }

  for (const slot of timeConfig) {
    const hour = typeof slot.hour === 'number' ? slot.hour : 0
    const minute = typeof slot.minute === 'number' ? slot.minute : 0
    const hourStr = String(hour).padStart(2, '0')
    const minuteStr = String(minute).padStart(2, '0')
    slots.push(`${dateStr}T${hourStr}:${minuteStr}:00+03:00`)
  }

  return slots
}

export function normalizeSlotForComparison(slotString: string): string {
  const date = new Date(slotString)
  return Number.isNaN(date.getTime()) ? '' : date.getTime().toString()
}

type UpdateFullyBookedOptions = {
  onDayFullyBooked?: (dateStr: string) => Promise<void> | void
  onDayReopened?: (dateStr: string) => Promise<void> | void
}

export async function updateFullyBookedState(
  dateStr: string,
  bookings: any[],
  options: UpdateFullyBookedOptions = {},
) {
  try {
    const availability = await readDataFile<any>('availability.json', { fullyBookedDates: [] })
    const allSlots = generateTimeSlotsForDateLocal(dateStr, availability)

    if (allSlots.length === 0) {
      return
    }

    const bookedSlots = new Set<string>()
    bookings.forEach((booking) => {
      if (!booking?.timeSlot) return
      const status = booking.status || 'confirmed'
      if (status === 'cancelled') return
      const normalized = normalizeSlotForComparison(booking.timeSlot)
      if (normalized) {
        bookedSlots.add(normalized)
      }
    })

    const allFilled = allSlots.every((slot) => {
      const normalized = normalizeSlotForComparison(slot)
      return bookedSlots.has(normalized)
    })

    const fullyBookedDates = Array.isArray(availability.fullyBookedDates) ? [...availability.fullyBookedDates] : []
    const isAlreadyMarked = fullyBookedDates.includes(dateStr)

    if (allFilled && !isAlreadyMarked) {
      fullyBookedDates.push(dateStr)
      availability.fullyBookedDates = Array.from(new Set(fullyBookedDates))
      await writeDataFile('availability.json', availability)
      revalidatePath('/api/availability')
      revalidatePath('/api/calendar/available-slots')
      revalidatePath('/booking')
      if (options.onDayFullyBooked) {
        await options.onDayFullyBooked(dateStr)
      }
    } else if (!allFilled && isAlreadyMarked) {
      availability.fullyBookedDates = fullyBookedDates.filter((d) => d !== dateStr)
      await writeDataFile('availability.json', availability)
      revalidatePath('/api/availability')
      revalidatePath('/api/calendar/available-slots')
      revalidatePath('/booking')
      if (options.onDayReopened) {
        await options.onDayReopened(dateStr)
      }
    }
  } catch (error) {
    console.error('Error updating fully booked status:', error)
  }
}

