import nodemailer from 'nodemailer'
import { readDataFile } from '@/lib/data-utils'

function normalizeBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ''

  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  return 'https://lashdiary.co.ke'
}

const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'
const BASE_URL = normalizeBaseUrl()
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'The LashDiary'
const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com'
const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465)
const ZOHO_SMTP_USER =
  process.env.ZOHO_SMTP_USER || process.env.ZOHO_SMTP_USERNAME || process.env.ZOHO_USERNAME || ''
const ZOHO_SMTP_PASS =
  process.env.ZOHO_SMTP_PASS || process.env.ZOHO_SMTP_PASSWORD || process.env.ZOHO_APP_PASSWORD || ''
const ZOHO_FROM_EMAIL =
  process.env.ZOHO_FROM_EMAIL ||
  process.env.ZOHO_FROM ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : '') ||
  BUSINESS_NOTIFICATION_EMAIL
const FROM_EMAIL =
  process.env.FROM_EMAIL ||
  ZOHO_FROM_EMAIL ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : BUSINESS_NOTIFICATION_EMAIL)

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

const zohoTransporter =
  ZOHO_SMTP_USER && ZOHO_SMTP_PASS
    ? nodemailer.createTransport({
        host: ZOHO_SMTP_HOST,
        port: ZOHO_SMTP_PORT,
        secure: ZOHO_SMTP_PORT === 465,
        auth: {
          user: ZOHO_SMTP_USER,
          pass: ZOHO_SMTP_PASS,
        },
      })
    : null

interface NewService {
  id: string
  name: string
  price: number
  priceUSD?: number
  duration?: number
  categoryName: string
}

interface EmailSubscriber {
  email: string
  name?: string
  subscribedAt?: string
  status?: 'active' | 'unsubscribed'
}

function createNewServiceEmailTemplate(service: NewService, subscriberName?: string) {
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  const name = subscriberName || 'there'
  const priceFormatted = `KSH ${service.price.toLocaleString()}`
  const durationText = service.duration ? `${service.duration} minutes` : 'Varies'
  const servicesUrl = `${BASE_URL}/services`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Service Available - ${service.name}</title>
</head>
<body style="margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color:${background};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:${card}; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:40px 32px; background:linear-gradient(135deg, ${brand} 0%, ${accent} 100%); text-align:center;">
              <h1 style="margin:0; font-size:28px; color:#FFFFFF; font-weight:600;">New Service Available!</h1>
              <p style="margin:12px 0 0 0; font-size:16px; color:#FFFFFF; opacity:0.95;">We're excited to share something special with you</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                Hi ${name}!
              </p>
              <p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                We're thrilled to announce our newest service: <strong style="color:${brand};">${service.name}</strong>!
              </p>

              <div style="border:2px solid ${accent}; border-radius:14px; padding:24px; background:${background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:22px; color:${brand}; font-weight:600;">${service.name}</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.8;">
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; width:100px;">Category</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:500;">${service.categoryName}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Price</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:600; font-size:18px;">${priceFormatted}</td>
                  </tr>
                  ${service.duration ? `
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Duration</td>
                    <td style="padding:6px 0; color:${textPrimary};">${durationText}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <div style="text-align:center; margin:32px 0;">
                <a href="${servicesUrl}" style="display:inline-block; padding:14px 32px; background:${brand}; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:16px; box-shadow:0 4px 12px rgba(124,75,49,0.3);">View All Services</a>
              </div>

              <p style="margin:24px 0 0 0; font-size:14px; line-height:1.6; color:${textSecondary};">
                Ready to book? Visit our services page to see all available options and schedule your appointment. We can't wait to see you!
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px; background:${background}; text-align:center; border-top:1px solid ${accent};">
              <p style="margin:0; font-size:13px; color:${textSecondary};">
                ${EMAIL_FROM_NAME} | <a href="${BASE_URL}" style="color:${brand}; text-decoration:none;">Visit Website</a>
              </p>
              <p style="margin:8px 0 0 0; font-size:12px; color:${textSecondary};">
                You're receiving this because you're subscribed to our service updates.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export async function sendNewServiceAnnouncement(service: NewService): Promise<{
  success: boolean
  sent: number
  failed: number
  errors: string[]
}> {
  if (!zohoTransporter) {
    console.warn('Email transporter not configured. Skipping new service announcement.')
    return {
      success: false,
      sent: 0,
      failed: 0,
      errors: ['Email transporter not configured'],
    }
  }

  try {
    // Get all active subscribers
    const subscribersData = await readDataFile('email-subscribers.json', { subscribers: [] })
    const subscribers: EmailSubscriber[] = Array.isArray(subscribersData.subscribers)
      ? subscribersData.subscribers.filter(
          (sub: EmailSubscriber) => sub.status !== 'unsubscribed' && sub.email
        )
      : []

    if (subscribers.length === 0) {
      console.log('No active subscribers found. Skipping email announcement.')
      return {
        success: true,
        sent: 0,
        failed: 0,
        errors: [],
      }
    }

    const emailSubject = `New Service Available 🤎`
    let sent = 0
    let failed = 0
    const errors: string[] = []

    // Send emails to all subscribers
    for (const subscriber of subscribers) {
      try {
        const htmlContent = createNewServiceEmailTemplate(service, subscriber.name)

        await zohoTransporter.sendMail({
          from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
          to: subscriber.email,
          subject: emailSubject,
          html: htmlContent,
        })

        sent++
      } catch (error) {
        failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to send to ${subscriber.email}: ${errorMessage}`)
        console.error(`Error sending new service email to ${subscriber.email}:`, error)
      }
    }

    return {
      success: true,
      sent,
      failed,
      errors,
    }
  } catch (error) {
    console.error('Error sending new service announcement:', error)
    return {
      success: false,
      sent: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

