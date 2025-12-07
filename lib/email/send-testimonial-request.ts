import nodemailer from 'nodemailer'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com'
const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465)
const ZOHO_SMTP_USER =
  process.env.ZOHO_SMTP_USER || process.env.ZOHO_SMTP_USERNAME || process.env.ZOHO_USERNAME || ''
const ZOHO_SMTP_PASS =
  process.env.ZOHO_SMTP_PASS || process.env.ZOHO_SMTP_PASSWORD || process.env.ZOHO_APP_PASSWORD || ''
const ZOHO_FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_FROM || ZOHO_SMTP_USER
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'The LashDiary'
const FALLBACK_FROM_EMAIL = process.env.FROM_EMAIL || 'hello@example.com'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

const hasZohoCredentials = Boolean(ZOHO_SMTP_USER && ZOHO_SMTP_PASS)

const zohoTransporter = hasZohoCredentials
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

const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

export type TestimonialEmailResult = {
  success: boolean
  provider: 'zoho' | 'resend' | 'none'
  messageId?: string
  error?: string
}

type SendTestimonialRequestOptions = {
  to: string
  name: string
  service?: string
  appointmentDate?: string
  appointmentTime?: string
  bookingId?: string
}

const formatDate = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatTime = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const buildTestimonialLink = (email: string, bookingId?: string) => {
  const params = new URLSearchParams({ email })
  if (bookingId) {
    params.set('bookingId', bookingId)
  }
  return `${BASE_URL.replace(/\/$/, '')}/testimonials?${params.toString()}`
}

const createEmailContent = ({
  name,
  service,
  appointmentDate,
  appointmentTime,
  link,
}: {
  name: string
  service?: string
  appointmentDate?: string | null
  appointmentTime?: string | null
  link: string
}) => {
  const safeName = name || 'Beautiful Soul'
  const formattedDate = appointmentDate ? formatDate(appointmentDate) : null
  const formattedTime = appointmentTime ? formatTime(appointmentTime) : null
  const serviceLine = service ? `<p style="margin: 4px 0; color:#6B4A3B;">Service: <strong>${service}</strong></p>` : ''
  const dateLine =
    formattedDate || formattedTime
      ? `<p style="margin: 4px 0; color:#6B4A3B;">Visited: <strong>${formattedDate || ''}${
          formattedTime ? ` at ${formattedTime}` : ''
        }</strong></p>`
      : ''

  const html = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FDF9F4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#FFFFFF;border-radius:24px;padding:32px;box-shadow:0 20px 45px -20px rgba(124,75,49,0.25);">
            <tr>
              <td style="text-align:center;padding-bottom:24px;">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;background:#F3E6DC;color:#7C4B31;font-size:28px;font-weight:600;">LD</div>
                <h1 style="margin:16px 0 8px 0;font-size:28px;font-family:'Helvetica Neue',Arial,sans-serif;color:#3E2A20;">We hope you loved your lash glow-up ✨</h1>
                <p style="margin:0;font-size:16px;color:#6B4A3B;">Hi ${safeName}, we'd love to hear how your appointment went.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0;">
                <div style="background:#FDF2EC;border-radius:16px;padding:20px;">
                  <p style="margin:0 0 12px 0;font-size:15px;color:#3E2A20;line-height:1.5;">
                    Your feedback helps us continue crafting the dreamiest lash experience in Nairobi. Could you share a few words (or a photo) about your visit?
                  </p>
                  ${serviceLine}
                  ${dateLine}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;text-align:center;">
                <a href="${link}" style="display:inline-block;background:#7C4B31;color:#FFFFFF;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;">
                  Share your testimonial
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:16px;">
                <p style="margin:0 0 12px 0;font-size:14px;color:#6B4A3B;line-height:1.6;">
                  It only takes a minute, and as a thank-you, your story could be featured on our website and socials—plus you’ll get priority access to future offers.
                </p>
                <p style="margin:0;font-size:14px;color:#6B4A3B;">
                  With love,<br />
                  <strong>LashDiary</strong>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-size:12px;color:#9C7C67;">
            If the button doesn’t work, copy and paste this link into your browser:<br />
            <a href="${link}" style="color:#7C4B31;">${link}</a>
          </p>
        </td>
      </tr>
    </table>
  `

  const textLines = [
    `Hi ${safeName},`,
    '',
    'We hope you loved your recent LashDiary appointment! Could you share a few words about your experience?',
  ]

  if (service) {
    textLines.push(`Service: ${service}`)
  }
  if (formattedDate || formattedTime) {
    textLines.push(`Visited: ${formattedDate || ''}${formattedTime ? ` at ${formattedTime}` : ''}`)
  }

  textLines.push(
    '',
    `Share your testimonial: ${link}`,
    '',
    'Your voice helps us keep delivering beautiful lash experiences.',
    '',
    'With gratitude,',
    'The LashDiary Team',
  )

  return { html, text: textLines.join('\n') }
}

export async function sendTestimonialRequestEmail(
  options: SendTestimonialRequestOptions,
): Promise<TestimonialEmailResult> {
  const { to, name, service, appointmentDate, appointmentTime, bookingId } = options

  if (!to) {
    return { success: false, provider: 'none', error: 'Recipient email is required' }
  }

  const testimonialLink = buildTestimonialLink(to, bookingId)
  const { html, text } = createEmailContent({
    name,
    service,
    appointmentDate,
    appointmentTime,
    link: testimonialLink,
  })

  const fromEmail = ZOHO_FROM_EMAIL || FALLBACK_FROM_EMAIL
  const fromAddress = `${EMAIL_FROM_NAME} <${fromEmail}>`
  const subject = 'We’d love your LashDiary testimonial ✨'

  if (zohoTransporter) {
    try {
      const result = await zohoTransporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text,
        replyTo: fromEmail,
      })

      return {
        success: true,
        provider: 'zoho',
        messageId: result.messageId,
      }
    } catch (error: any) {
      console.error('Zoho SMTP testimonial email error:', error)
      if (!resendClient) {
        return {
          success: false,
          provider: 'zoho',
          error: error?.message || 'Zoho SMTP error',
        }
      }
    }
  }

  if (resendClient) {
    try {
      const result = await resendClient.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
        text,
      })

      return {
        success: true,
        provider: 'resend',
        messageId: result.data?.id,
      }
    } catch (error: any) {
      console.error('Resend testimonial email error:', error)
      return {
        success: false,
        provider: 'resend',
        error: error?.message || 'Resend error',
      }
    }
  }

  return {
    success: false,
    provider: 'none',
    error: 'No email provider configured. Please configure Zoho SMTP or Resend.',
  }
}

