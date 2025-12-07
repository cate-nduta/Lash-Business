import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'
import { loadPolicies } from '@/lib/policies-utils'
import { sendPartnerOnboardingEmail } from '@/lib/email/send-partner-onboarding'

export const revalidate = 0
export const dynamic = 'force-dynamic'

function buildAnnouncementEmail({
  monthLabel,
  bookingPeriod,
  bookingLink,
  depositPercentage,
  cancellationWindowHours,
  recipientName,
}: {
  monthLabel: string
  bookingPeriod: string
  bookingLink: string
  depositPercentage: number
  cancellationWindowHours: number
  recipientName?: string | null
}) {
  const friendlyName =
    typeof recipientName === 'string' && recipientName.trim().length > 0
      ? recipientName.trim().split(' ')[0]
      : 'gorgeous'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Serif+Text&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background: #FDF9F4;">
  <div style="font-family: 'DM Serif Text', Georgia, serif; padding: 32px; background: #FDF9F4; color: #3E2A20; max-width: 600px; margin: 0 auto; text-align: left;">
    <h2 style="margin-top: 0; margin-bottom: 20px; color: #7C4B31; font-size: 28px; text-align: left; font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-weight: 600; line-height: 1.3; letter-spacing: 0.5px;">You know the drill. Book that Lash Appointment</h2>
    <p style="font-size: 15px; line-height: 1.6; font-family: 'DM Serif Text', Georgia, serif; margin: 0 0 16px 0; text-align: left;">Hi ${friendlyName},</p>
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">${monthLabel} appointments are officially open.</p>
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">If you already know your schedule, this is the time to secure your spot. The usual prime times go quickly — weekends, evenings, and the first week of the month tend to disappear fast.</p>
    
    <div style="margin: 24px 0; padding: 20px; background: #FFFFFF; border: 1px solid #E4D3C4; border-radius: 12px;">
      <p style="margin: 0 0 12px; font-weight: 600; color: #7C4B31; font-family: 'DM Serif Text', Georgia, serif;"><strong>Quick details:</strong></p>
      <p style="margin: 0 0 8px; font-family: 'DM Serif Text', Georgia, serif;">• <strong>Booking window:</strong> ${bookingPeriod}</p>
      <p style="margin: 0 0 8px; font-family: 'DM Serif Text', Georgia, serif;">• <strong>Deposit:</strong> ${depositPercentage}% to confirm your slot (strictly for securing your booking, non-refundable under any circumstance)</p>
      <p style="margin: 0; font-family: 'DM Serif Text', Georgia, serif;">• <strong>Policy:</strong> Please review our <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/policies" style="color:#7C4B31;text-decoration:underline;">booking policies</a> for full details</p>
    </div>

    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">Book early, skip the scramble, and get a time that actually fits your life.</p>

    <div style="margin: 32px 0;">
      <a href="${bookingLink}" target="_blank" style="display:inline-block;padding:14px 28px;background-color:#7C4B31;color:#FFFFFF;text-decoration:none;border-radius:999px;font-weight:600;font-size:16px;font-family: 'DM Serif Text', Georgia, serif;">
        Book your ${monthLabel} appointment here
      </a>
    </div>

    <p style="font-size: 15px; line-height: 1.6; margin-top: 32px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">See you soon!<br/>🤎 The LashDiary Team</p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #EADFD6;" />
    <p style="font-size:14px;color:#7C4B31;font-family: 'DM Serif Text', Georgia, serif; text-align: left;">Need support? Reply to this email or reach us at <a href="mailto:${process.env.CALENDAR_EMAIL || 'hello@lashdiary.co.ke'}" style="color:#7C4B31;text-decoration:none;">${process.env.CALENDAR_EMAIL || 'hello@lashdiary.co.ke'}</a>.</p>
  </div>
</body>
</html>
  `.trim()

  const text = [
    `Hi ${friendlyName},`,
    '',
    `${monthLabel} appointments are officially open.`,
    '',
    `If you already know your schedule, this is the time to secure your spot. The usual prime times go quickly — weekends, evenings, and the first week of the month tend to disappear fast.`,
    '',
    `Quick details:`,
    '',
    `• Booking window: ${bookingPeriod}`,
    `• Deposit: ${depositPercentage}% to confirm your slot (strictly for securing your booking, non-refundable under any circumstance)`,
    `• Policy: Please review our booking policies at ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/policies for full details`,
    '',
    `Book early, skip the scramble, and get a time that actually fits your life.`,
    '',
    `Book your ${monthLabel} appointment here: ${bookingLink}`,
    '',
    'See you soon,',
    'The LashDiary Team',
  ].join('\n')

  return { html, text }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json().catch(() => ({}))
    
    // Get current month label
    const today = new Date()
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthLabel = typeof body?.monthLabel === 'string' && body.monthLabel.trim().length > 0
      ? body.monthLabel.trim()
      : currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    // Get booking window info
    const availability = await readDataFile<{ bookingWindow?: any }>('availability.json', {})
    const bookingWindow = availability?.bookingWindow
    const windowDetails = bookingWindow?.current ?? bookingWindow?.next

    const bookingPeriod = windowDetails?.label 
      ? windowDetails.label
      : windowDetails?.startDate && windowDetails?.endDate
        ? `${new Date(windowDetails.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${new Date(windowDetails.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
        : monthLabel

    const bookingLink = typeof body?.bookingLink === 'string' && body.bookingLink.trim().length > 0
      ? body.bookingLink.trim()
      : bookingWindow?.bookingLink 
        ? (bookingWindow.bookingLink.startsWith('http') ? bookingWindow.bookingLink : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${bookingWindow.bookingLink.startsWith('/') ? bookingWindow.bookingLink : '/' + bookingWindow.bookingLink}`)
        : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/booking`

    const subject = typeof body?.subject === 'string' && body.subject.trim().length > 0
      ? `${body.subject.trim()} 🤎`
      : `${monthLabel} Bookings Are NOW OPEN — Secure Your Spot! 🤎`

    const [policies, bookingsData, subscribersData] = await Promise.all([
      loadPolicies(),
      readDataFile<{ bookings?: Array<{ email?: string | null; name?: string | null }> }>('bookings.json', { bookings: [] }),
      readDataFile<{ subscribers?: Array<{ email?: string | null; name?: string | null }> }>('email-subscribers.json', { subscribers: [] }),
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
        addRecipient(booking?.email, booking?.name)
      })
    }

    if (Array.isArray(subscribersData?.subscribers)) {
      subscribersData.subscribers.forEach((subscriber) => {
        addRecipient(subscriber?.email, subscriber?.name)
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
      monthLabel,
      bookingPeriod,
      details: failures.length > 0 ? failures : undefined,
    })
  } catch (error: any) {
    console.error('Error sending 1st announcement:', error)
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to send announcement email', details: error?.message },
      { status: 500 },
    )
  }
}

