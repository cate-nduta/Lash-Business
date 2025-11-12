import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import {
  updateFullyBookedState,
  generateTimeSlotsForDateLocal,
  normalizeSlotForComparison,
} from '@/lib/availability-utils'
import { sendEmailNotification } from '../../email/utils'

const CLIENT_MANAGE_WINDOW_HOURS = Math.max(Number(process.env.CLIENT_MANAGE_WINDOW_HOURS || 72) || 72, 1)

type ManageAction = 'reschedule' | 'transfer'

function computePolicyState(booking: any) {
  const now = new Date()
  const start = new Date(booking.timeSlot)
  const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
  const windowHours =
    typeof booking.cancellationWindowHours === 'number' && !Number.isNaN(booking.cancellationWindowHours)
      ? booking.cancellationWindowHours
      : CLIENT_MANAGE_WINDOW_HOURS
  const withinWindow = hoursUntil < windowHours
  const within24Hours = hoursUntil < 24

  return {
    now,
    start,
    hoursUntil,
    windowHours,
    withinWindow,
    within24Hours,
    isPast: start.getTime() <= now.getTime(),
  }
}

function sanitizeBooking(booking: any) {
  const policy = computePolicyState(booking)
  const status = booking.status || 'confirmed'
  const canManage =
    status === 'confirmed' && !policy.isPast && booking.clientManageDisabled !== true && booking.cancelledAt == null
  const canAct = canManage && !policy.isPast && !policy.within24Hours

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
    cancellationCutoffAt:
      typeof booking.cancellationCutoffAt === 'string'
        ? booking.cancellationCutoffAt
        : new Date(policy.start.getTime() - policy.windowHours * 60 * 60 * 1000).toISOString(),
    withinPolicyWindow: policy.withinWindow,
    within24Hours: policy.within24Hours,
    isPast: policy.isPast,
    canCancel: false,
    canReschedule: canAct,
    canTransfer: canAct,
    canManage,
    salonReferral: booking.salonReferral || null,
    lastClientManageActionAt: booking.lastClientManageActionAt || null,
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

  return NextResponse.json({
    booking: sanitizeBooking(booking),
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

  if (action !== 'reschedule' && action !== 'transfer') {
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

  const policy = computePolicyState(booking)
  const canManage =
    booking.status === 'confirmed' && !policy.isPast && booking.clientManageDisabled !== true && booking.cancelledAt == null
  const canAct = canManage && !policy.within24Hours

  if (!canAct) {
    return NextResponse.json(
      {
        error:
          policy.within24Hours || policy.isPast
            ? 'Appointments can no longer be changed online. Please contact the studio for assistance.'
            : policy.withinWindow
            ? `Online changes are only available more than ${policy.windowHours} hours before your appointment. Please contact the studio so we can assist.`
            : 'This booking cannot be modified online.',
      },
      { status: 403 },
    )
  }

  const nowISO = new Date().toISOString()
  const wasTransfer = action === 'transfer'
  const previousClientName = booking.name

  let newGuestName = ''
  let newGuestEmail = ''
  let newGuestPhone = ''

  if (wasTransfer) {
    newGuestName = typeof body?.newName === 'string' ? body.newName.trim() : ''
    newGuestEmail = typeof body?.newEmail === 'string' ? body.newEmail.trim() : ''
    newGuestPhone = typeof body?.newPhone === 'string' ? body.newPhone.trim() : ''

    if (!newGuestName || newGuestName.length < 2) {
      return NextResponse.json({ error: 'Please provide the guest’s full name.' }, { status: 400 })
    }
    if (!newGuestEmail || !newGuestEmail.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email for the new guest.' }, { status: 400 })
    }
    if (!newGuestPhone || newGuestPhone.length < 7) {
      return NextResponse.json({ error: 'Please provide a valid phone number for the new guest.' }, { status: 400 })
    }
  }

  // Reschedule or transfer path
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

  if (!wasTransfer && isSameSlot) {
    return NextResponse.json({ error: 'You are already booked for that slot.' }, { status: 400 })
  }

  if (!isSameSlot && newStart.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Cannot reschedule to a past time.' }, { status: 400 })
  }

  if (!isSameSlot) {
    const availability = await readDataFile<any>('availability.json', { fullyBookedDates: [] })
    const allowedSlots = generateTimeSlotsForDateLocal(targetDate, availability)
    const normalizedRequestedSlot = normalizeSlotForComparison(newStart.toISOString())

    if (!allowedSlots.some((slot) => normalizeSlotForComparison(slot) === normalizedRequestedSlot)) {
      return NextResponse.json({ error: 'Selected time is not available for booking.' }, { status: 400 })
    }

    const conflict = bookings.some((b, index) => {
      if (index === bookingIndex) return false
      if (b.status === 'cancelled') return false
      if (!b.timeSlot) return false
      return normalizeSlotForComparison(b.timeSlot) === normalizedRequestedSlot
    })

    if (conflict) {
      return NextResponse.json({ error: 'That slot was just taken. Please choose another.' }, { status: 409 })
    }
  }

  const historyEntry = {
    fromDate: booking.date,
    fromTimeSlot: booking.timeSlot,
    toDate: targetDate,
    toTimeSlot: newStart.toISOString(),
    rescheduledAt: nowISO,
    rescheduledBy: 'client' as const,
    notes: wasTransfer ? `Client transferred appointment to ${newGuestName}.` : 'Client rescheduled online.',
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
  if (wasTransfer) {
    booking.name = newGuestName
    booking.email = newGuestEmail
    booking.phone = newGuestPhone
    if (booking.salonReferralDetails) {
      booking.salonReferralDetails.clientName = newGuestName
      booking.salonReferralDetails.clientEmail = newGuestEmail
      booking.salonReferralDetails.clientPhone = newGuestPhone
    }
    if (booking.salonReferral) {
      booking.salonReferral.clientName = newGuestName
      booking.salonReferral.clientEmail = newGuestEmail
      booking.salonReferral.clientPhone = newGuestPhone
    }
  }
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

  const responsePayload: Record<string, unknown> = {
    booking: sanitizeBooking(booking),
    status: wasTransfer ? 'transferred' : 'rescheduled',
  }

  if (wasTransfer) {
    try {
      await sendEmailNotification({
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        service: booking.service || 'Lash Service',
        date: booking.date,
        timeSlot: booking.timeSlot,
        location: booking.location || '',
        originalPrice:
          typeof booking.originalPrice === 'number'
            ? booking.originalPrice
            : Number(booking.originalPrice ?? booking.finalPrice ?? 0),
        finalPrice:
          typeof booking.finalPrice === 'number'
            ? booking.finalPrice
            : Number(booking.finalPrice ?? booking.originalPrice ?? 0) || undefined,
        deposit: typeof booking.deposit === 'number' ? booking.deposit : Number(booking.deposit ?? 0),
        bookingId: booking.id,
        manageToken: booking.manageToken,
        policyWindowHours: booking.cancellationWindowHours,
        transferFromName: previousClientName,
        notes: typeof booking.notes === 'string' ? booking.notes : undefined,
      })
      responsePayload.emailSent = true
    } catch (emailError: any) {
      console.error('Failed to send transfer confirmation email:', emailError)
      responsePayload.emailSent = false
      responsePayload.emailError = emailError?.message || 'Unable to send transfer confirmation email.'
    }
  }

  return NextResponse.json(responsePayload)
}

