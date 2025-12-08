import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'
import { sendPartnerOnboardingEmail } from '@/lib/email/send-partner-onboarding'

export const revalidate = 0
export const dynamic = 'force-dynamic'

function buildReminderEmail({
  bookingLink,
  recipientName,
}: {
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
    <h2 style="margin-top: 0; margin-bottom: 20px; color: #7C4B31; font-size: 28px; text-align: left; font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-weight: 600; line-height: 1.3; letter-spacing: 0.5px;">Hey bestie, how's your week? 🤎</h2>
    <p style="font-size: 15px; line-height: 1.6; font-family: 'DM Serif Text', Georgia, serif; margin: 0 0 16px 0; text-align: left;">Hey ${friendlyName},</p>
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">Just checking in! How's everything going? Been crushing your goals or just trying to make it through the week? Either way, you're doing amazing. 🤎</p>
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">I was just thinking about you and wanted to see how you're doing. Life gets busy, but taking a moment for yourself (and your lashes) is always worth it.</p>
    
    <div style="background: #FFFFFF; border-left: 4px solid #7C4B31; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; font-family: 'DM Serif Text', Georgia, serif; color: #3E2A20;">
        💭 <strong>Quick thought:</strong>
      </p>
      <p style="margin: 0; font-size: 15px; line-height: 1.6; font-family: 'DM Serif Text', Georgia, serif; color: #3E2A20;">
        When your lashes look good, you feel good. It's that simple. And when you feel good, you're unstoppable. Just saying. 😉
      </p>
    </div>

    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">
      If you're thinking about booking or just want to chat, I'm here. Drop me a line on Instagram or book whenever you're ready—no pressure, just friend vibes. 🤎
    </p>

    <div style="margin: 32px 0; text-align: left;">
      <a href="${bookingLink}" target="_blank" style="display:inline-block;padding:14px 28px;background-color:#7C4B31;color:#FFFFFF;text-decoration:none;border-radius:999px;font-weight:600;font-size:16px;font-family: 'DM Serif Text', Georgia, serif;">
        Book Your Spot
      </a>
    </div>

    <p style="font-size: 15px; line-height: 1.6; margin-top: 32px; font-family: 'DM Serif Text', Georgia, serif; text-align: left;">Sending you all the good vibes,</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 4px 0 0 0; font-family: 'DM Serif Text', Georgia, serif; text-align: left; color: #7C4B31; font-weight: 600;">The LashDiary Team 🤎</p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #EADFD6;" />
    <p style="font-size:14px;color:#7C4B31;font-family: 'DM Serif Text', Georgia, serif; text-align: left;">Need support? Reply to this email or reach us at <a href="mailto:${process.env.CALENDAR_EMAIL || 'hello@lashdiary.co.ke'}" style="color:#7C4B31;text-decoration:none;">${process.env.CALENDAR_EMAIL || 'hello@lashdiary.co.ke'}</a>.</p>
  </div>
</body>
</html>
  `.trim()

  const text = [
    `Hey bestie, how's your week? 🤎`,
    '',
    `Hey ${friendlyName},`,
    '',
    `Just checking in! How's everything going? Been crushing your goals or just trying to make it through the week? Either way, you're doing amazing. 🤎`,
    '',
    `I was just thinking about you and wanted to see how you're doing. Life gets busy, but taking a moment for yourself (and your lashes) is always worth it.`,
    '',
    `💭 Quick thought:`,
    `When your lashes look good, you feel good. It's that simple. And when you feel good, you're unstoppable. Just saying. 😉`,
    '',
    `If you're thinking about booking or just want to chat, I'm here. Drop me a line on Instagram or book whenever you're ready—no pressure, just friend vibes. 🤎`,
    '',
    `Book Your Spot: ${bookingLink}`,
    '',
    'Sending you all the good vibes,',
    'The LashDiary Team 🤎',
  ].join('\n')

  return { html, text }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json().catch(() => ({}))
    
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
      : `Hey bestie, how's your week? 🤎`

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
      details: failures.length > 0 ? failures : undefined,
    })
  } catch (error: any) {
    console.error('Error sending 5th reminder:', error)
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to send reminder email', details: error?.message },
      { status: 500 },
    )
  }
}

