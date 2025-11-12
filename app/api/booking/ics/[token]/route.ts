import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { getSalonCommissionSettings } from '@/lib/discount-utils'

const CLIENT_MANAGE_WINDOW_HOURS = Math.max(Number(process.env.CLIENT_MANAGE_WINDOW_HOURS || 72) || 72, 1)

const SERVICE_DURATION_MINUTES: Record<string, number> = {
  'Classic Lashes': 90,
  'Subtle Hybrid Lashes': 120,
  'Hybrid Lashes': 120,
  'Volume Lashes': 150,
  'Mega Volume Lashes': 180,
  'Wispy Lashes': 150,
  'Classic Infill': 60,
  'Subtle Hybrid Infill': 75,
  'Hybrid Infill': 75,
  'Volume Infill': 90,
  'Mega Volume Infill': 120,
  'Wispy Infill': 90,
  'Lash Lift': 60,
}

function formatICSDate(date: Date) {
  const toISOString = date.toISOString().replace(/[-:]/g, '')
  return `${toISOString.slice(0, 15)}Z`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const rawToken = typeof params?.token === 'string' ? params.token : ''
  const token = decodeURIComponent(rawToken).trim()
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  const data = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
  const bookings = data.bookings || []
  let booking = bookings.find(
    (b) =>
      typeof b.manageToken === 'string' &&
      b.manageToken.length > 0 &&
      b.manageToken === token,
  )

  if (!booking) {
    booking = bookings.find((b) => typeof b.id === 'string' && b.id === token)
  }

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.clientManageDisabled === true) {
    return NextResponse.json({ error: 'Link disabled by studio' }, { status: 403 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Booking already cancelled' }, { status: 410 })
  }

  const startTime = new Date(booking.timeSlot)
  if (Number.isNaN(startTime.getTime())) {
    return NextResponse.json({ error: 'Invalid booking time' }, { status: 400 })
  }

  const durationMinutes =
    typeof booking.service === 'string' && SERVICE_DURATION_MINUTES[booking.service]
      ? SERVICE_DURATION_MINUTES[booking.service]
      : 120
  const endTime = new Date(startTime)
  endTime.setMinutes(endTime.getMinutes() + durationMinutes)

  const now = new Date()
  const dtStamp = formatICSDate(now)
  const dtStart = formatICSDate(startTime)
  const dtEnd = formatICSDate(endTime)

  const summary =
    typeof booking.service === 'string' && booking.service.trim().length > 0
      ? `LashDiary — ${booking.service}`
      : 'LashDiary Appointment'
  const location =
    typeof booking.location === 'string' && booking.location.trim().length > 0
      ? booking.location.trim()
      : process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'

  const descriptionLines = [
    `Client: ${booking.name || ''}`.trim(),
    `Phone: ${booking.phone || ''}`.trim(),
    `Email: ${booking.email || ''}`.trim(),
    `Service: ${booking.service || 'Lash service'}`,
    `Deposit: KSH ${(booking.deposit || 0).toLocaleString()}`,
    `Cancellation policy: ${booking.cancellationWindowHours || CLIENT_MANAGE_WINDOW_HOURS} hours before appointment`,
  ].filter((line) => line && line.length > 0)

  const { searchParams } = new URL(request.url)
  const format = (searchParams.get('format') || 'google').toLowerCase()

  if (format === 'ics' || format === 'download') {
    const body = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LashDiary//Booking//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${booking.id || token}@lashdiary`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${descriptionLines.join('\\n')}`,
      `LOCATION:${location.replace(/,/g, '\\,')}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Appointment Reminder',
      'TRIGGER:-PT24H',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n')

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="lashdiary-${booking.id || token}.ics"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }

  const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render')
  googleCalendarUrl.searchParams.set('action', 'TEMPLATE')
  googleCalendarUrl.searchParams.set('text', summary)
  googleCalendarUrl.searchParams.set('dates', `${dtStart}/${dtEnd}`)
  if (descriptionLines.length) {
    googleCalendarUrl.searchParams.set('details', descriptionLines.join('\\n'))
  }
  if (location) {
    googleCalendarUrl.searchParams.set('location', location)
  }

  return NextResponse.redirect(googleCalendarUrl.toString(), 302)
}

