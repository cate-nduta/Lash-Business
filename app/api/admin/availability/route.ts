import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFilePreferRemote, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const revalidate = 0
export const dynamic = 'force-dynamic'

function normalizeBookingWindow(value: unknown): Record<string, unknown> {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const minimumNoticeHours = Number(source.minimumNoticeHours)
  const rescheduleCutoffHours = Number(source.rescheduleCutoffHours)
  const minimumNoticeByDay =
    source.minimumNoticeByDay && typeof source.minimumNoticeByDay === 'object'
      ? Object.fromEntries(
          Object.entries(source.minimumNoticeByDay as Record<string, unknown>)
            .filter(([, notice]) => notice !== '' && notice !== null && notice !== undefined)
            .map(([day, notice]) => [day, Math.max(0, Number(notice) || 0)])
        )
      : {}

  return {
    ...source,
    current: source.current && typeof source.current === 'object' ? source.current : {},
    next: source.next && typeof source.next === 'object' ? source.next : {},
    minimumNoticeHours:
      Number.isFinite(minimumNoticeHours) && minimumNoticeHours >= 0 ? minimumNoticeHours : 12,
    minimumNoticeByDay,
    rescheduleCutoffHours:
      Number.isFinite(rescheduleCutoffHours) && rescheduleCutoffHours >= 0 ? rescheduleCutoffHours : 12,
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const availability = await readDataFilePreferRemote('availability.json', {})
    return NextResponse.json(availability)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching availability:', error)
    return NextResponse.json({ availability: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const incoming = await request.json()
    const existing = await readDataFilePreferRemote<Record<string, unknown>>('availability.json', {})

    // Merge so admin panel (partial payload) does not wipe fullyBookedDates, minimumBookingDate, etc.
    const availability: Record<string, unknown> = {
      ...existing,
      businessHours: incoming.businessHours ?? existing.businessHours,
      timeSlots: incoming.timeSlots ?? existing.timeSlots,
      bookingWindow: normalizeBookingWindow(incoming.bookingWindow ?? existing.bookingWindow),
      homeCalls: incoming.homeCalls !== undefined ? incoming.homeCalls : existing.homeCalls,
      fullyBookedDates: Array.isArray(incoming.fullyBookedDates)
        ? incoming.fullyBookedDates
        : Array.isArray(existing.fullyBookedDates)
          ? existing.fullyBookedDates
          : [],
      minimumBookingDate:
        incoming.minimumBookingDate !== undefined
          ? incoming.minimumBookingDate
          : existing.minimumBookingDate ?? null,
    }

    await writeDataFile('availability.json', availability)
    revalidatePath('/api/availability')
    revalidatePath('/api/calendar/available-slots')
    revalidatePath('/booking')
    revalidatePath('/api/booking/manage')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving availability:', error)
    return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
  }
}

