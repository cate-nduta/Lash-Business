import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, readDataFilePreferRemote, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho } from '@/lib/email/zoho-config'
import { initializeTransaction } from '@/lib/paystack-utils'
import { normalizeServiceCatalog } from '@/lib/services-utils'
import { formatAssistedExpiryLabel } from '@/lib/assisted-booking-utils'
import {
  hasAppointmentConflict,
  loadBookingBusyIntervals,
  loadModelApplicationBusyIntervals,
} from '@/lib/model-application-settings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_SETTINGS = {
  reservationExpiryMinutes: 120,
}

type PendingAssistedBooking = {
  bookingReference: string
  bookingData: any
  createdAt: string
  expiresAt?: string
  paymentUrl?: string
  paymentReference?: string
  emailSent?: boolean
  emailSentAt?: string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatSlot(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date)
}

function formatDateTime(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date)
}

async function loadSettings() {
  const settings = await readDataFile<typeof DEFAULT_SETTINGS>('admin-assisted-booking-settings.json', DEFAULT_SETTINGS)
  const reservationExpiryMinutes = Number((settings as any)?.reservationExpiryMinutes)
  const reservationExpiryHours = Number((settings as any)?.reservationExpiryHours)
  const minutes =
    Number.isFinite(reservationExpiryMinutes) && reservationExpiryMinutes > 0
      ? Math.round(reservationExpiryMinutes)
      : Number.isFinite(reservationExpiryHours) && reservationExpiryHours > 0
        ? Math.round(reservationExpiryHours * 60)
        : DEFAULT_SETTINGS.reservationExpiryMinutes
  return {
    reservationExpiryMinutes: minutes,
    reservationExpiryHours: Math.max(1, Math.round(minutes / 60)),
  }
}

async function getDepositPercentage() {
  const discounts = await readDataFilePreferRemote<{ depositPercentage?: number }>('discounts.json', {})
  const value = Number(discounts?.depositPercentage)
  return Number.isFinite(value) && value > 0 ? value : 40
}

async function loadAssistedBookingTracker() {
  const [pendingBookings, bookingsData] = await Promise.all([
    readDataFilePreferRemote<PendingAssistedBooking[]>('pending-bookings.json', []),
    readDataFilePreferRemote<any[] | { bookings?: any[] }>('bookings.json', { bookings: [] }),
  ])
  const bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData.bookings || []
  const paidByReference = new Map(
    bookings
      .filter((booking) => booking?.bookingReference)
      .map((booking) => [booking.bookingReference, booking])
  )
  const now = Date.now()

  const paymentLinks = pendingBookings
    .filter((pending) => pending?.bookingReference && pending?.bookingData?.createdByAdmin === true)
    .map((pending) => {
      const paidBooking = paidByReference.get(pending.bookingReference)
      const expiresAtMs = pending.expiresAt ? new Date(pending.expiresAt).getTime() : null
      const isExpired = expiresAtMs !== null && Number.isFinite(expiresAtMs) && expiresAtMs <= now
      return {
        bookingReference: pending.bookingReference,
        clientName: pending.bookingData?.name || '',
        clientEmail: pending.bookingData?.email || '',
        clientPhone: pending.bookingData?.phone || '',
        serviceNames: pending.bookingData?.service || '',
        dateTimeLabel: pending.bookingData?.timeSlot ? formatSlot(pending.bookingData.timeSlot) : '',
        sentAt: pending.createdAt,
        sentAtLabel: formatDateTime(pending.createdAt),
        expiresAt: pending.expiresAt || '',
        expiresAtLabel: pending.expiresAt ? formatDateTime(pending.expiresAt) : '',
        paymentUrl: pending.paymentUrl || '',
        paymentReference: pending.paymentReference || '',
        emailSent: pending.emailSent === true,
        status: paidBooking ? 'paid' : isExpired ? 'expired' : 'pending',
        bookingId: paidBooking?.bookingId || paidBooking?.id || '',
      }
    })
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())

  const recentPaidBookings = bookings
    .filter((booking) => (booking?.assistedBooking || booking?.createdByAdmin) && booking.paymentStatus === 'paid')
    .sort((a, b) => new Date(b.paidAt || b.createdAt || 0).getTime() - new Date(a.paidAt || a.createdAt || 0).getTime())
    .slice(0, 10)
    .map((booking) => ({
      bookingReference: booking.bookingReference || '',
      bookingId: booking.bookingId || booking.id || '',
      clientName: booking.name || '',
      clientEmail: booking.email || '',
      serviceNames: booking.service || (Array.isArray(booking.services) ? booking.services.join(' + ') : ''),
      dateTimeLabel: booking.timeSlot ? formatSlot(booking.timeSlot) : '',
      paidAt: booking.paidAt || '',
      paidAtLabel: formatDateTime(booking.paidAt || booking.createdAt),
      deposit: Number(booking.deposit || 0),
    }))

  return { paymentLinks, recentPaidBookings }
}

export async function GET() {
  try {
    await requireAdminAuth()
    const [settings, depositPercentage, tracker] = await Promise.all([
      loadSettings(),
      getDepositPercentage(),
      loadAssistedBookingTracker(),
    ])
    return NextResponse.json({ settings, depositPercentage, ...tracker })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading assisted booking settings:', error)
    return NextResponse.json({ error: 'Failed to load assisted booking settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()

    if (body.action === 'updateSettings') {
      const reservationExpiryMinutes = Number(body.reservationExpiryMinutes)
      const reservationExpiryHours = Number(body.reservationExpiryHours)
      const minutes =
        Number.isFinite(reservationExpiryMinutes) && reservationExpiryMinutes > 0
          ? Math.round(reservationExpiryMinutes)
          : Number.isFinite(reservationExpiryHours) && reservationExpiryHours > 0
            ? Math.round(reservationExpiryHours * 60)
            : DEFAULT_SETTINGS.reservationExpiryMinutes
      const settings = {
        reservationExpiryMinutes: minutes,
        reservationExpiryHours: Math.max(1, Math.round(minutes / 60)),
      }
      await writeDataFile('admin-assisted-booking-settings.json', settings)
      return NextResponse.json({ success: true, settings })
    }

    if (body.action === 'release') {
      const bookingReference = String(body.bookingReference || '').trim()
      if (!bookingReference) {
        return NextResponse.json({ error: 'Booking reference is required.' }, { status: 400 })
      }

      const [pendingBookings, reservations] = await Promise.all([
        readDataFilePreferRemote<PendingAssistedBooking[]>('pending-bookings.json', []),
        readDataFilePreferRemote<Array<{ bookingReference?: string }>>('pending-booking-reservations.json', []),
      ])
      await Promise.all([
        writeDataFile('pending-bookings.json', pendingBookings.filter((pending) => pending.bookingReference !== bookingReference)),
        writeDataFile(
          'pending-booking-reservations.json',
          reservations.filter((reservation) => reservation.bookingReference !== bookingReference)
        ),
      ])

      return NextResponse.json({ success: true, ...(await loadAssistedBookingTracker()) })
    }

    if (body.action !== 'create') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = String(body.phone || '').trim()
    const date = String(body.date || '').trim()
    const timeSlot = String(body.timeSlot || '').trim()
    const serviceIds = Array.isArray(body.serviceIds) ? body.serviceIds.map(String) : []
    const notes = String(body.notes || '').trim()
    const appointmentPreference = String(body.appointmentPreference || '').trim()
    const location = String(body.location || '').trim()

    if (!name || !email || !phone || !date || !timeSlot || serviceIds.length === 0) {
      return NextResponse.json({ error: 'Name, email, phone, date, time, and at least one service are required.' }, { status: 400 })
    }

    const slotStart = new Date(timeSlot)
    if (Number.isNaN(slotStart.getTime())) {
      return NextResponse.json({ error: 'Invalid appointment time.' }, { status: 400 })
    }

    const rawServices = await readDataFilePreferRemote('services.json', {})
    const { catalog } = normalizeServiceCatalog(rawServices)
    const selectedServices = catalog.categories.flatMap((category) =>
      category.services
        .filter((service) => serviceIds.includes(service.id))
        .map((service) => ({
          name: service.name,
          categoryName: category.name,
          duration: service.duration || 60,
          price: service.price || 0,
        }))
    )

    if (selectedServices.length === 0) {
      return NextResponse.json({ error: 'Selected services could not be found.' }, { status: 400 })
    }

    const serviceSubtotal = selectedServices.reduce((sum, service) => sum + Math.max(Number(service.price) || 0, 0), 0)
    const totalDurationMinutes = selectedServices.reduce((sum, service) => sum + Math.max(Number(service.duration) || 0, 0), 0) || 60
    const finalPrice = serviceSubtotal
    const depositPercentage = await getDepositPercentage()
    const deposit = Math.max(1, Math.round(finalPrice * (depositPercentage / 100)))
    const bookingReference = `Admin-${Date.now()}-${name.slice(0, 3).toUpperCase()}`
    const settings = await loadSettings()
    const expiresAt = new Date(Date.now() + settings.reservationExpiryMinutes * 60 * 1000).toISOString()

    const [bookingBusyIntervals, modelBusyIntervals] = await Promise.all([
      loadBookingBusyIntervals({ excludeBookingReference: bookingReference }),
      loadModelApplicationBusyIntervals(),
    ])
    if (hasAppointmentConflict(slotStart, totalDurationMinutes, [...bookingBusyIntervals, ...modelBusyIntervals])) {
      return NextResponse.json({ error: 'This time slot overlaps with an existing booking or model appointment.' }, { status: 409 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'
    const payment = await initializeTransaction({
      email,
      amount: deposit,
      currency: 'KES',
      callbackUrl: `${baseUrl}/api/paystack/callback`,
      customerName: name,
      phone,
      reference: bookingReference,
      metadata: {
        payment_type: 'booking',
        booking_reference: bookingReference,
        assisted_booking: true,
      },
    })

    if (!payment.success || !payment.authorizationUrl) {
      return NextResponse.json({ error: payment.error || 'Failed to create Paystack payment link.' }, { status: 500 })
    }

    const createdAt = new Date().toISOString()
    const bookingData = {
      name,
      email,
      phone,
      service: selectedServices.map((service) => service.name).join(' + '),
      services: selectedServices.map((service) => service.name),
      serviceDetails: selectedServices,
      date,
      timeSlot,
      location: location || undefined,
      visitType: 'studio',
      notes,
      appointmentPreference,
      originalPrice: finalPrice,
      serviceSubtotal,
      homeVisitFee: 0,
      discount: 0,
      finalPrice,
      deposit,
      paymentMethod: 'paystack',
      paymentOrderTrackingId: null,
      isFirstTimeClient: false,
      totalDuration: totalDurationMinutes / 60,
      totalDurationMinutes,
      createdByAdmin: true,
    }

    const pendingBookings = await readDataFilePreferRemote<PendingAssistedBooking[]>('pending-bookings.json', [])
    pendingBookings.push({
      bookingReference,
      bookingData,
      createdAt,
      expiresAt,
      paymentUrl: payment.authorizationUrl,
      paymentReference: payment.reference,
    })
    await writeDataFile('pending-bookings.json', pendingBookings)

    const reservations = await readDataFilePreferRemote<Array<any>>('pending-booking-reservations.json', [])
    const now = new Date()
    const activeReservations = reservations.filter((reservation) => new Date(reservation.expiresAt).getTime() > now.getTime())
    activeReservations.push({
      bookingReference,
      date,
      timeSlot,
      reservedAt: createdAt,
      expiresAt,
      totalDurationMinutes,
      source: 'admin-assisted-booking',
    })
    await writeDataFile('pending-booking-reservations.json', activeReservations)

    const safeName = escapeHtml(name)
    const safeSlot = escapeHtml(formatSlot(timeSlot))
    const safeServices = escapeHtml(selectedServices.map((service) => service.name).join(' + '))
    const safeDeposit = escapeHtml(`KES ${deposit.toLocaleString()}`)
    const safeTotal = escapeHtml(`KES ${finalPrice.toLocaleString()}`)
    const safeExpiry = escapeHtml(formatAssistedExpiryLabel(expiresAt))

    const emailResult = await sendEmailViaZoho({
      to: email,
      subject: 'Confirm Your LashDiary Appointment',
      html: `
        <div style="font-family: Georgia, serif; padding:24px; background:#FDF9F4; color:#7C4B31;">
          <div style="max-width:640px; margin:0 auto; background:#FFFFFF; border:1px solid #E8D5C4; border-radius:18px; padding:28px;">
            <h1 style="margin:0 0 16px; color:#7C4B31;">Confirm Your Appointment</h1>
            <p style="font-size:16px; line-height:1.6;">Hey ${safeName},</p>
            <p style="font-size:16px; line-height:1.6;">LashDiary has reserved an appointment for you. Your booking is only confirmed after your deposit is paid.</p>
            <div style="background:#F5F1EB; border-left:4px solid #7C4B31; padding:16px; border-radius:8px; margin:20px 0;">
              <p><strong>Service:</strong> ${safeServices}</p>
              <p><strong>Date & time:</strong> ${safeSlot}</p>
              <p><strong>Total:</strong> ${safeTotal}</p>
              <p><strong>Required deposit (${depositPercentage}%):</strong> ${safeDeposit}</p>
              <p><strong>Payment link expires:</strong> ${safeExpiry}</p>
            </div>
            <p style="font-size:16px; line-height:1.6;"><strong>Please pay your deposit ${safeExpiry}.</strong> This payment link will expire, and if payment is not completed in time, this slot may be released for another booking.</p>
            <div style="text-align:center; margin:26px 0;">
              <a href="${payment.authorizationUrl}" style="display:inline-block; padding:12px 28px; background:#7C4B31; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600;">Pay Deposit To Confirm</a>
            </div>
            <p style="font-size:14px; line-height:1.6;">After payment, you will receive the normal LashDiary booking confirmation email with your appointment details.</p>
          </div>
        </div>
      `,
    })

    const latestPendingBookings = await readDataFilePreferRemote<PendingAssistedBooking[]>('pending-bookings.json', [])
    await writeDataFile(
      'pending-bookings.json',
      latestPendingBookings.map((pending) =>
        pending.bookingReference === bookingReference
          ? { ...pending, emailSent: emailResult.success, emailSentAt: emailResult.success ? new Date().toISOString() : null }
          : pending
      )
    )

    const serviceNames = selectedServices.map((service) => service.name).join(' + ')
    const expiresAtIso = expiresAt

    return NextResponse.json({
      success: true,
      bookingReference,
      paymentUrl: payment.authorizationUrl,
      paymentReference: payment.reference,
      deposit,
      finalPrice,
      depositPercentage,
      expiresAt: expiresAtIso,
      serviceNames,
      clientName: name,
      clientPhone: phone,
      clientEmail: email,
      dateTimeLabel: formatSlot(timeSlot),
      emailSent: emailResult.success,
      emailError: emailResult.error || null,
    })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating assisted booking:', error)
    return NextResponse.json({ error: 'Failed to create assisted booking.' }, { status: 500 })
  }
}
