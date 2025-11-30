import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'
import { loadPolicies } from '@/lib/policies-utils'
import { sendPartnerOnboardingEmail } from '@/lib/email/send-partner-onboarding'
import { formatEmailSubject } from '@/lib/email-subject-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

type BookingWindowConfig = {
  current?: {
    startDate?: string
    endDate?: string
    label?: string
  }
  next?: {
    startDate?: string
    endDate?: string
    label?: string
    opensAt?: string
    emailSubject?: string
  }
  bookingLink?: string
}

function parseDateOnly(dateStr?: string | null) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const parsed = new Date(`${dateStr}T00:00:00+03:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateRange({ startDate, endDate, label }: { startDate?: string; endDate?: string; label?: string | null }) {
  if (label && label.trim().length > 0) {
    return label
  }
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }

  if (start && end) {
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    const startLabel = start.toLocaleDateString('en-US', formatOptions)
    const endLabel = end.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : formatOptions)
    return `${startLabel} – ${endLabel}`
  }

  if (start) return start.toLocaleDateString('en-US', formatOptions)
  if (end) return end.toLocaleDateString('en-US', formatOptions)
  return null
}

function formatDateDisplay(dateStr?: string | null) {
  const parsed = parseDateOnly(dateStr)
  if (!parsed) return null
  return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
}

function resolveBookingLink(rawLink?: string | null) {
  const fallbackBase = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const base = fallbackBase.replace(/\/$/, '')
  if (!rawLink) return `${base}/booking`
  if (/^https?:\/\//i.test(rawLink)) return rawLink
  const trimmed = rawLink.startsWith('/') ? rawLink : `/${rawLink}`
  return `${base}${trimmed}`
}

function buildAnnouncementEmail({
  monthLabel,
  bookingPeriod,
  bookingLink,
  depositPercentage,
  cancellationWindowHours,
  openDate,
  closeDate,
  recipientName,
}: {
  monthLabel: string
  bookingPeriod: string
  bookingLink: string
  depositPercentage: number
  cancellationWindowHours: number
  openDate?: string | null
  closeDate?: string | null
  recipientName?: string | null
}) {
  const introMonth = monthLabel || 'the new month'
  const friendlyName =
    typeof recipientName === 'string' && recipientName.trim().length > 0
      ? recipientName.trim().split(' ')[0]
      : 'gorgeous'

  const formatExactDate = (value?: string | null) => {
    if (!value || typeof value !== 'string') return null
    const parsed = new Date(`${value}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const openLabel = formatExactDate(openDate)
  const closeLabel = formatExactDate(closeDate)

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; background: #FDF9F4; color: #3E2A20;">
      <h2 style="margin-top: 0; margin-bottom: 20px; color: #7C4B31;">🌈 ${introMonth} Bookings Are Now Open! 🥰</h2>
      <p>🥰 Hey ${friendlyName}, 💋</p>
      <p>🌈 It's that time again — a brand new month of beauty! Our appointment slots are officially open, and you can now secure your spot for your favourite lash or brow service. 🥰</p>
      <p>💋 Our calendar fills up fast, so if you already have your preferred dates in mind, go ahead and grab them early before they're gone. 🌈</p>
      <div style="margin: 24px 0; padding: 20px; background: #FFFFFF; border: 1px solid #E4D3C4; border-radius: 12px;">
        <p style="margin: 0 0 12px;"><strong>Booking period:</strong><br/>
          ${openLabel ? `Open from <strong>${openLabel}</strong><br/>` : ''}
          ${closeLabel ? `Close on <strong>${closeLabel}</strong>` : bookingPeriod}
        </p>
        <p style="margin: 0 0 12px;"><strong>Deposit:</strong> ${depositPercentage}% to confirm your slot (strictly for securing your booking, non-refundable under any circumstance)</p>
        <p style="margin: 0;"><strong>Policy:</strong> Please review our <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/policies" style="color:#7C4B31;text-decoration:underline;">booking policies</a> for full details</p>
      </div>
      <p style="margin-bottom: 28px;">You can book directly here:</p>
      <p style="margin-bottom: 28px;">
        <a href="${bookingLink}" target="_blank" style="display:inline-block;padding:14px 28px;background-color:#7C4B31;color:#FFFFFF;text-decoration:none;border-radius:999px;font-weight:600;">
          Book ${introMonth}
        </a>
      </p>
      <p>🥰 Can't wait to see you soon and get those lashes/brows looking flawless for the new month! 💋</p>
      <p style="margin-top:24px;">🤎 With love,<br/>The LashDiary Team 🥰</p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #EADFD6;" />
      <p style="font-size:14px;color:#7C4B31;">Need support? Reply to this email or reach us at <a href="mailto:${process.env.CALENDAR_EMAIL || 'hello@lashdiary.co.ke'}" style="color:#7C4B31;">${process.env.CALENDAR_EMAIL || 'hello@lashdiary.co.ke'}</a>.</p>
    </div>
  `.replace(/\n\s+/g, '\n')

  const text = [
    `🌈 ${introMonth} Bookings Are Now Open! 🤎`,
    '',
    `Hey ${friendlyName},`,
    '',
    'It’s that time again — a brand new month of beauty! Our appointment slots are officially open, and you can now secure your spot for your favourite lash or brow service.',
    '',
    'Our calendar fills up fast, so if you already have your preferred dates in mind, go ahead and grab them early before they’re gone.',
    '',
    'Booking period:',
    openLabel ? `Open from ${openLabel}` : '',
    closeLabel ? `Close on ${closeLabel}` : bookingPeriod,
    `Deposit: ${depositPercentage}% to confirm your slot (strictly for securing your booking, non-refundable under any circumstance)`,
    `Policy: Please review our booking policies at ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/policies for full details`,
    '',
    `Book here: ${bookingLink}`,
    '',
    'Can’t wait to see you soon and get those lashes/brows looking flawless for the new month!',
    '',
    'With love,',
    'The LashDiary Team',
  ].join('\n')

  return { html, text }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json().catch(() => ({}))

    const availability = await readDataFile<{ bookingWindow?: BookingWindowConfig }>('availability.json', {})
    const bookingWindow = availability?.bookingWindow
    const windowDetails = bookingWindow?.next ?? bookingWindow?.current

    if (!windowDetails) {
      return NextResponse.json(
        { error: 'Booking window is not configured. Update availability first.' },
        { status: 400 },
      )
    }

    const monthLabel = typeof body?.monthLabel === 'string' && body.monthLabel.trim().length > 0
      ? body.monthLabel.trim()
      : windowDetails.label ?? 'Next Month'

    const bookingPeriod =
      formatDateRange({
        startDate: windowDetails.startDate,
        endDate: windowDetails.endDate,
        label: windowDetails.label ?? null,
      }) ?? monthLabel

    const bookingLink = resolveBookingLink(body?.bookingLink || bookingWindow?.bookingLink)

    const defaultSubject =
      'emailSubject' in windowDetails &&
      typeof windowDetails.emailSubject === 'string' &&
      windowDetails.emailSubject.trim().length > 0
        ? windowDetails.emailSubject.trim()
        : `${monthLabel} Bookings Are Now Open!`

    const subject = formatEmailSubject(
      typeof body?.subject === 'string' && body.subject.trim().length > 0
        ? body.subject.trim()
        : defaultSubject
    )

    const [policies, bookingsData, subscribersData] = await Promise.all([
      loadPolicies(),
      readDataFile<{ bookings?: Array<{ email?: string | null }> }>('bookings.json', { bookings: [] }),
      readDataFile<{ subscribers?: Array<{ email?: string | null }> }>('email-subscribers.json', { subscribers: [] }),
    ])

    const depositPercentage = policies.variables.depositPercentage ?? 0
    const cancellationWindowHours = policies.variables.cancellationWindowHours ?? 72

    const recipients = new Map<string, string>() // email -> name

    const addRecipient = (email?: string | null, name?: string | null) => {
      if (!email || typeof email !== 'string') return
      const trimmed = email.trim().toLowerCase()
      if (!trimmed || !trimmed.includes('@')) return
      if (!recipients.has(trimmed)) {
        recipients.set(trimmed, name && name.trim().length > 0 ? name.trim() : 'LashDiary VIP')
      }
    }

    if (Array.isArray(bookingsData?.bookings)) {
      bookingsData.bookings.forEach((booking) => {
        addRecipient(booking?.email, (booking as any)?.name)
      })
    }

    if (Array.isArray(subscribersData?.subscribers)) {
      subscribersData.subscribers.forEach((subscriber) => {
        addRecipient(subscriber?.email, (subscriber as any)?.name)
      })
    }

    if (recipients.size === 0) {
      return NextResponse.json(
        { error: 'No client emails found to send the announcement.' },
        { status: 400 },
      )
    }

    const successes: string[] = []
    const failures: Array<{ email: string; error: string }> = []

  for (const [email, name] of Array.from(recipients.entries())) {
      try {
      const { html, text } = buildAnnouncementEmail({
        monthLabel,
        bookingPeriod,
        bookingLink,
        depositPercentage,
        cancellationWindowHours,
        openDate: windowDetails.startDate,
        closeDate: windowDetails.endDate,
        recipientName: name,
      })

        const result = await sendPartnerOnboardingEmail({
          to: email,
          subject,
          html,
          text,
        })
        if (result.success) {
          successes.push(email)
        } else {
          failures.push({ email, error: result.error || 'Unknown error' })
        }
      } catch (error: any) {
        failures.push({ email, error: error?.message || 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: failures.length === 0,
      sent: successes.length,
      failed: failures.length,
      subject,
      bookingPeriod,
      nextOpensAt: formatDateDisplay(bookingWindow?.next?.opensAt),
      details: failures.length > 0 ? failures : undefined,
    })
  } catch (error: any) {
    console.error('Error sending booking window announcement:', error)
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to send booking window announcement', details: error?.message },
      { status: 500 },
    )
  }
}


