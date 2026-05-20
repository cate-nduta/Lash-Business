import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import {
  updateFullyBookedState,
  generateTimeSlotsForDateLocal,
  normalizeSlotForComparison,
} from '@/lib/availability-utils'
import { sendEmailNotification } from '../../email/utils'
import {
  getMinimumNoticeHours,
  getRescheduleCutoffHours,
  isWithinRescheduleCutoff,
} from '@/lib/booking-notice-utils'
import { getCalendarClient } from '@/lib/google-calendar-client'

const CLIENT_MANAGE_WINDOW_HOURS = Math.max(Number(process.env.CLIENT_MANAGE_WINDOW_HOURS || 72) || 72, 1)
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

type ManageAction = 'reschedule' | 'change-service'

function computePolicyState(booking: any, rescheduleCutoffHours: number) {
  const now = new Date()
  const start = new Date(booking.timeSlot)
  const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
  const windowHours =
    typeof booking.cancellationWindowHours === 'number' && !Number.isNaN(booking.cancellationWindowHours)
      ? booking.cancellationWindowHours
      : CLIENT_MANAGE_WINDOW_HOURS
  const withinWindow = hoursUntil < windowHours
  const withinRescheduleWindow = isWithinRescheduleCutoff(hoursUntil, rescheduleCutoffHours)

  return {
    now,
    start,
    hoursUntil,
    windowHours,
    withinWindow,
    withinRescheduleWindow,
    rescheduleCutoffHours,
    isPast: start.getTime() <= now.getTime(),
  }
}

function sanitizeBooking(booking: any, rescheduleCutoffHours: number) {
  const policy = computePolicyState(booking, rescheduleCutoffHours)
  const status = booking.status || 'confirmed'
  const canManage =
    status === 'confirmed' && !policy.isPast && booking.clientManageDisabled !== true && booking.cancelledAt == null
  const canAct = canManage && !policy.isPast && !policy.withinRescheduleWindow

  return {
    id: booking.id,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    service: booking.service,
    date: booking.date,
    timeSlot: booking.timeSlot,
    location: booking.location,
    notes: booking.notes,
    status,
    finalPrice: booking.finalPrice,
    deposit: booking.deposit,
    cancellationPolicyHours: policy.windowHours,
    rescheduleCutoffHours: policy.rescheduleCutoffHours,
    cancellationCutoffAt:
      typeof booking.cancellationCutoffAt === 'string'
        ? booking.cancellationCutoffAt
        : new Date(policy.start.getTime() - policy.windowHours * 60 * 60 * 1000).toISOString(),
    withinPolicyWindow: policy.withinWindow,
    withinRescheduleWindow: policy.withinRescheduleWindow,
    isPast: policy.isPast,
    canCancel: false,
    canReschedule: canAct,
    canManage,
    salonReferral: booking.salonReferral || null,
    lastClientManageActionAt: booking.lastClientManageActionAt || null,
    desiredLook: typeof booking.desiredLook === 'string' && booking.desiredLook.trim().length > 0 ? booking.desiredLook.trim() : null,
    desiredLookStatus:
      booking.desiredLookStatus === 'recommended'
        ? 'recommended'
        : booking.desiredLookStatus === 'custom'
        ? 'custom'
        : null,
    desiredLookStatusMessage:
      typeof booking.desiredLookStatusMessage === 'string' && booking.desiredLookStatusMessage.trim().length > 0
        ? booking.desiredLookStatusMessage.trim()
        : null,
    desiredLookMatchesRecommendation: booking.desiredLookMatchesRecommendation === true,
  }
}

async function loadShowcaseBookings(): Promise<any[]> {
  try {
    const showcaseData = await readDataFile<Array<{ appointmentDate?: string; status?: string }>>(
      'labs-showcase-bookings.json',
      [],
    )
    return Array.isArray(showcaseData)
      ? showcaseData.map((booking) => ({
          timeSlot: booking.appointmentDate,
          status: booking.status,
        }))
      : []
  } catch {
    return []
  }
}

async function getCalendarSlotStatus(
  dateStr: string,
  normalizedRequestedSlot: string,
): Promise<'clear' | 'conflict' | 'unknown'> {
  try {
    const calendar = await getCalendarClient()
    if (!calendar) return 'clear'

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: new Date(`${dateStr}T00:00:00+03:00`).toISOString(),
      timeMax: new Date(`${dateStr}T23:59:59.999+03:00`).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = response.data.items || []
    const hasConflict = events.some((event: { start?: { dateTime?: string | null } | null }) => {
      if (!event.start?.dateTime) return false
      return normalizeSlotForComparison(event.start.dateTime) === normalizedRequestedSlot
    })
    return hasConflict ? 'conflict' : 'clear'
  } catch (error) {
    console.warn('Google Calendar conflict check failed during reschedule:', error)
    return 'unknown'
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } },
) {
  const token = params?.token?.trim() || ''
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
  const bookings = data.bookings || []
  const booking = bookings.find(
    (b) => typeof b.manageToken === 'string' && b.manageToken.length > 0 && b.manageToken === token,
  )

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.clientManageDisabled === true) {
    return NextResponse.json({ error: 'Self-service actions disabled for this booking.' }, { status: 403 })
  }

  const availability = await readDataFile<any>('availability.json', {})
  const rescheduleCutoffHours = getRescheduleCutoffHours(availability?.bookingWindow)

  return NextResponse.json({
    booking: sanitizeBooking(booking, rescheduleCutoffHours),
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const token = params?.token?.trim() || ''
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const body = await request.json()
  const action: ManageAction = body?.action

  if (action !== 'reschedule' && action !== 'change-service') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  }

  const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
  const bookings = data.bookings || []
  const bookingIndex = bookings.findIndex(
    (b) => typeof b.manageToken === 'string' && b.manageToken.length > 0 && b.manageToken === token,
  )

  if (bookingIndex === -1) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const booking = bookings[bookingIndex]

  if (booking.clientManageDisabled === true) {
    return NextResponse.json({ error: 'Self-service actions disabled for this booking.' }, { status: 403 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Booking already cancelled.' }, { status: 410 })
  }

  const availability = await readDataFile<any>('availability.json', {})
  const rescheduleCutoffHours = getRescheduleCutoffHours(availability?.bookingWindow)
  const policy = computePolicyState(booking, rescheduleCutoffHours)
  const canManage =
    booking.status === 'confirmed' && !policy.isPast && booking.clientManageDisabled !== true && booking.cancelledAt == null
  const canAct = canManage && !policy.withinRescheduleWindow

  if (!canAct) {
    return NextResponse.json(
      {
        error:
          policy.withinRescheduleWindow || policy.isPast
            ? `You may reschedule your appointment up to ${rescheduleCutoffHours} hours before your scheduled time. Please contact the studio for assistance.`
            : policy.withinWindow
            ? `Online changes are only available more than ${policy.windowHours} hours before your appointment. Please contact the studio so we can assist.`
            : 'This booking cannot be modified online.',
      },
      { status: 403 },
    )
  }

  const nowISO = new Date().toISOString()

  // Handle service change action
  if (action === 'change-service') {
    const newServiceName = typeof body?.newService === 'string' ? body.newService.trim() : ''
    if (!newServiceName) {
      return NextResponse.json({ error: 'New service name is required.' }, { status: 400 })
    }

    // Load services to get pricing
    const servicesData = await readDataFile<any>('services.json', { categories: [] })
    const { catalog } = await import('@/lib/services-utils').then(m => m.normalizeServiceCatalog(servicesData))
    
    // Find current and new service prices
    const currentServicePrice = booking.originalPrice || booking.finalPrice || 0
    let newServicePrice = 0
    
    // Search for service in catalog
    for (const category of catalog.categories || []) {
      for (const service of category.services || []) {
        if (service.name === newServiceName) {
          newServicePrice = service.price || 0
          break
        }
      }
      if (newServicePrice > 0) break
    }

    if (newServicePrice === 0) {
      return NextResponse.json({ error: 'Service not found. Please select a valid service.' }, { status: 400 })
    }

    // Preserve existing discounts when changing service
    // Calculate what discount was applied originally
    const originalFinalPrice = booking.finalPrice || booking.originalPrice || 0
    const originalOriginalPrice = booking.originalPrice || booking.finalPrice || 0
    const originalDiscount = originalOriginalPrice - originalFinalPrice
    
    // Apply the same discount percentage to the new service price
    let discountPercent = 0
    if (originalDiscount > 0 && originalOriginalPrice > 0) {
      discountPercent = originalDiscount / originalOriginalPrice
    }
    
    // Calculate new final price with preserved discount (no penalty)
    const newDiscountAmount = Math.round(newServicePrice * discountPercent)
    const newFinalPrice = newServicePrice - newDiscountAmount
    
    // Update booking with new service
    const oldService = booking.service
    booking.service = newServiceName
    booking.originalPrice = newServicePrice
    booking.finalPrice = newFinalPrice
    booking.discount = newDiscountAmount // Preserve discount amount
    booking.serviceChangedAt = nowISO
    booking.lastClientManageActionAt = nowISO
    booking.manageTokenLastUsedAt = nowISO

    // Add to history
    if (!Array.isArray(booking.serviceChangeHistory)) {
      booking.serviceChangeHistory = []
    }
    booking.serviceChangeHistory.push({
      fromService: oldService,
      toService: newServiceName,
      changedAt: nowISO,
      changedBy: 'client',
    })

    bookings[bookingIndex] = booking
    await writeDataFile('bookings.json', { bookings })

    // Send confirmation email
    try {
      const { sendEmailNotification } = await import('../../email/utils')
      await sendEmailNotification({
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        service: booking.service || 'Lash Service',
        date: booking.date,
        timeSlot: booking.timeSlot,
        location: booking.location || '',
        originalPrice: booking.originalPrice,
        finalPrice: booking.finalPrice,
        deposit: booking.deposit || 0,
        bookingId: booking.id,
        manageToken: booking.manageToken,
        policyWindowHours: booking.cancellationWindowHours,
        notes: typeof booking.notes === 'string' ? booking.notes : undefined,
        desiredLook: booking.desiredLook || 'Not specified',
        desiredLookStatus: booking.desiredLookStatus === 'recommended' ? 'recommended' : 'custom',
        isReminder: false,
      })
    } catch (emailError) {
      console.error('Failed to send service change confirmation email:', emailError)
    }

    return NextResponse.json({
      booking: sanitizeBooking(booking, rescheduleCutoffHours),
      status: 'service-changed',
      newServicePrice,
    })
  }

  // Reschedule path
  const existingDate =
    typeof booking.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(booking.date)
      ? booking.date
      : new Date(booking.timeSlot).toISOString().slice(0, 10)
  const requestedDate =
    typeof body?.newDate === 'string' && body.newDate.trim().length > 0 ? body.newDate.trim() : null
  const targetDate = requestedDate || existingDate
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return NextResponse.json({ error: 'Valid new date is required.' }, { status: 400 })
  }

  const requestedTimeSlot =
    typeof body?.newTimeSlot === 'string' && body.newTimeSlot.trim().length > 0
      ? body.newTimeSlot.trim()
      : booking.timeSlot
  let newStart = new Date(requestedTimeSlot)
  if (Number.isNaN(newStart.getTime())) {
    newStart = new Date(booking.timeSlot)
  }
  if (Number.isNaN(newStart.getTime())) {
    return NextResponse.json({ error: 'We could not locate the original appointment time on file.' }, { status: 400 })
  }

  const bookingStart = new Date(booking.timeSlot)
  const isSameSlot = newStart.toISOString() === bookingStart.toISOString() && targetDate === existingDate

  if (isSameSlot) {
    return NextResponse.json({ error: 'You are already booked for that slot.' }, { status: 400 })
  }

  if (!isSameSlot && newStart.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Cannot reschedule to a past time.' }, { status: 400 })
  }

  if (!isSameSlot) {
    const now = new Date()
    const hoursUntilNewAppointment = (newStart.getTime() - now.getTime()) / (1000 * 60 * 60)
    const availability = await readDataFile<any>('availability.json', { fullyBookedDates: [] })
    const minAdvanceBookingHours = getMinimumNoticeHours(targetDate, availability.bookingWindow)
    
    if (hoursUntilNewAppointment < minAdvanceBookingHours) {
      return NextResponse.json(
        { 
          error: `All appointments must be booked at least ${minAdvanceBookingHours} hours in advance. Please select a later date and time.`,
          details: `The selected appointment time is only ${Math.round(hoursUntilNewAppointment * 10) / 10} hours away. Bookings must be made at least ${minAdvanceBookingHours} hours before the appointment time.`
        },
        { status: 400 },
      )
    }
    
    const allowedSlots = generateTimeSlotsForDateLocal(targetDate, availability)
    const normalizedRequestedSlot = normalizeSlotForComparison(newStart.toISOString())

    if (!allowedSlots.some((slot) => normalizeSlotForComparison(slot) === normalizedRequestedSlot)) {
      return NextResponse.json({ error: 'Selected time is not available for booking.' }, { status: 400 })
    }

    const showcaseBookings = await loadShowcaseBookings()
    const conflict = [...bookings, ...showcaseBookings].some((b, index) => {
      if (index === bookingIndex) return false
      if (b.status === 'cancelled') return false
      if (!b.timeSlot) return false
      return normalizeSlotForComparison(b.timeSlot) === normalizedRequestedSlot
    })

    if (conflict) {
      return NextResponse.json({ error: 'That slot was just taken. Please choose another.' }, { status: 409 })
    }

    const calendarSlotStatus = await getCalendarSlotStatus(targetDate, normalizedRequestedSlot)
    if (calendarSlotStatus === 'conflict') {
      return NextResponse.json({ error: 'That slot is already booked on the studio calendar. Please choose another.' }, { status: 409 })
    }
    if (calendarSlotStatus === 'unknown') {
      return NextResponse.json(
        { error: 'We could not verify the studio calendar for that slot. Please try again in a moment.' },
        { status: 503 },
      )
    }
  }

  const historyEntry = {
    fromDate: booking.date,
    fromTimeSlot: booking.timeSlot,
    toDate: targetDate,
    toTimeSlot: newStart.toISOString(),
    rescheduledAt: nowISO,
    rescheduledBy: 'client' as const,
    notes: 'Client rescheduled online.',
  }

  const windowHours =
    typeof booking.cancellationWindowHours === 'number' && !Number.isNaN(booking.cancellationWindowHours)
      ? booking.cancellationWindowHours
      : CLIENT_MANAGE_WINDOW_HOURS
  const newCutoff = new Date(newStart.getTime() - windowHours * 60 * 60 * 1000)

  if (!Array.isArray(booking.rescheduleHistory)) {
    booking.rescheduleHistory = []
  }
  booking.rescheduleHistory.push(historyEntry)
  booking.date = targetDate
  booking.timeSlot = newStart.toISOString()
  booking.rescheduledAt = nowISO
  booking.rescheduledBy = 'client'
  booking.cancellationCutoffAt = newCutoff.toISOString()
  booking.cancellationWindowHours = windowHours
  booking.lastClientManageActionAt = nowISO
  booking.manageTokenLastUsedAt = nowISO

  bookings[bookingIndex] = booking
  await writeDataFile('bookings.json', { bookings })

  const availabilityChangedDates = new Set<string>([historyEntry.fromDate, targetDate])

  try {
    await Promise.all(
      Array.from(availabilityChangedDates, async (dateStr) => {
        await updateFullyBookedState(dateStr, bookings)
      }),
    )
  } catch (error) {
    console.error('Failed to update availability after reschedule:', error)
  }

  // Send confirmation email after rescheduling
  try {
    const { sendEmailNotification } = await import('../../email/utils')
    await sendEmailNotification({
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      service: booking.service || 'Lash Service',
      date: booking.date,
      timeSlot: booking.timeSlot,
      location: booking.location || '',
      originalPrice: booking.originalPrice,
      finalPrice: booking.finalPrice,
      deposit: booking.deposit || 0,
      bookingId: booking.id,
      manageToken: booking.manageToken,
      policyWindowHours: booking.cancellationWindowHours,
      notes: typeof booking.notes === 'string' ? booking.notes : undefined,
      desiredLook: booking.desiredLook || 'Not specified',
      desiredLookStatus: booking.desiredLookStatus === 'recommended' ? 'recommended' : 'custom',
      isReminder: false,
    })
  } catch (emailError) {
    console.error('Failed to send reschedule confirmation email:', emailError)
  }

  const responsePayload: Record<string, unknown> = {
    booking: sanitizeBooking(booking, rescheduleCutoffHours),
    status: 'rescheduled',
  }

  return NextResponse.json(responsePayload)
}

