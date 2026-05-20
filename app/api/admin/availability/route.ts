import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const availability = await readDataFile('availability.json', {})
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
    const existing = await readDataFile<Record<string, unknown>>('availability.json', {})

    // Merge so admin panel (partial payload) does not wipe fullyBookedDates, minimumBookingDate, etc.
    const availability: Record<string, unknown> = {
      ...existing,
      businessHours: incoming.businessHours ?? existing.businessHours,
      timeSlots: incoming.timeSlots ?? existing.timeSlots,
      bookingWindow: incoming.bookingWindow ?? existing.bookingWindow,
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

    // Ensure bookingWindow structure is preserved even if current/next are empty
    const bw = availability.bookingWindow as Record<string, unknown> | undefined
    if (bw && typeof bw === 'object') {
      if (!bw.current || typeof bw.current !== 'object' || Object.keys(bw.current as object).length === 0) {
        bw.current = {}
      }
      if (!bw.next || typeof bw.next !== 'object' || Object.keys(bw.next as object).length === 0) {
        bw.next = {}
      }
      availability.bookingWindow = bw
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

