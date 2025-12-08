import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'
import { loadPolicies } from '@/lib/policies-utils'
import { sendPartnerOnboardingEmail } from '@/lib/email/send-partner-onboarding'

export const revalidate = 0
export const dynamic = 'force-dynamic'

function buildReminderEmail({
  nextMonthLabel,
  bookingLink,
  recipientName,
}: {
  nextMonthLabel: string
  bookingLink: string
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
    <h2 style="margin-top: 0; margin-bottom: 20px; color: #7C4B31; font-size: 28px; text-align: left; font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-weight: 600; line-height: 1.3; letter-spacing: 0.5px;">It's almost time — don't blink.</h2>
    <p style="font-size: 15px; line-height: 1.6; font-family: 'DM Serif Text', Georgia, serif; margin: 0 0 16px 0; text-align: left;">Hi ${friendlyName},</p>
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">Quick heads up — ${nextMonthLabel} bookings open on the 1st, and we wanted to give you a friendly nudge before they go live.</p>
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">If you want your usual time or anything close to it, make sure you're ready when the calendar goes live.</p>
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">You'll get another email from me on the 1st when bookings officially open. This is just your early notice so you can plan ahead and grab your spot before it's gone.</p>
    <p style="font-size: 15px; line-height: 1.6; margin-top: 32px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">See you soon,<br/>The LashDiary Team</p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #EADFD6;" />
    <p style="font-size:14px;color:#7C4B31;font-family: 'DM Serif Text', Georgia, serif; text-align: left;">Need support? Reply to this email or reach us at <a href="mailto:${process.env.CALENDAR_EMAIL || 'hello@lashdiary.co.ke'}" style="color:#7C4B31;text-decoration:none;">${process.env.CALENDAR_EMAIL || 'hello@lashdiary.co.ke'}</a>.</p>
  </div>
</body>
</html>
  `.trim()

  const text = [
    `It's almost time — don't blink.`,
    '',
    `Hi ${friendlyName},`,
    '',
    `Quick heads up — ${nextMonthLabel} bookings open on the 1st, and we wanted to give you a friendly nudge before they go live.`,
    '',
    `If you want your usual time or anything close to it, make sure you're ready when the calendar goes live.`,
    '',
    `You'll get another email from me on the 1st when bookings officially open. This is just your early notice so you can plan ahead and grab your spot before it's gone.`,
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
    
    // Get next month label
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const nextMonthLabel = typeof body?.nextMonthLabel === 'string' && body.nextMonthLabel.trim().length > 0
      ? body.nextMonthLabel.trim()
      : nextMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    const bookingLink = typeof body?.bookingLink === 'string' && body.bookingLink.trim().length > 0
      ? body.bookingLink.trim()
      : (() => {
          const raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || ''
          if (typeof raw === 'string' && raw.trim().length > 0) {
            const trimmed = raw.trim().replace(/\/+$/, '')
            if (/^https?:\/\//i.test(trimmed)) {
              return `${trimmed}/booking`
            }
            return `https://${trimmed}/booking`
          }
          return 'https://lashdiary.co.ke/booking'
        })()

    const subject = typeof body?.subject === 'string' && body.subject.trim().length > 0
      ? `${body.subject.trim()} 🤎`
      : `Lash Appointment Bookings Open Soon — ${nextMonthLabel} 🤎`

    // Get all recipients (bookings + subscribers)
    const [bookingsData, subscribersData] = await Promise.all([
      readDataFile<{ bookings?: Array<{ email?: string | null; name?: string | null }> }>('bookings.json', { bookings: [] }),
      readDataFile<{ subscribers?: Array<{ email?: string | null; name?: string | null }> }>('email-subscribers.json', { subscribers: [] }),
    ])

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
        { error: 'No client emails found to send the reminder.' },
        { status: 400 },
      )
    }

    const successes: string[] = []
    const failures: Array<{ email: string; error: string }> = []

    for (const [email, name] of Array.from(recipients.entries())) {
      try {
        const { html, text } = buildReminderEmail({
          nextMonthLabel,
          bookingLink,
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
      nextMonthLabel,
      details: failures.length > 0 ? failures : undefined,
    })
  } catch (error: any) {
    console.error('Error sending 26th reminder:', error)
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to send reminder email', details: error?.message },
      { status: 500 },
    )
  }
}

