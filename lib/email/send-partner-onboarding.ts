import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { formatEmailSubject } from '@/lib/email-subject-utils'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com'
const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465)
const ZOHO_SMTP_USER =
  process.env.ZOHO_SMTP_USER || process.env.ZOHO_SMTP_USERNAME || process.env.ZOHO_USERNAME || ''
const ZOHO_SMTP_PASS =
  process.env.ZOHO_SMTP_PASS || process.env.ZOHO_SMTP_PASSWORD || process.env.ZOHO_APP_PASSWORD || ''
const ZOHO_FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_FROM || ZOHO_SMTP_USER
const rawFromName = process.env.EMAIL_FROM_NAME || 'The LashDiary'
const EMAIL_FROM_NAME = rawFromName === 'LashDiary' ? 'The LashDiary' : rawFromName
const FALLBACK_FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'

const hasZohoCredentials = ZOHO_SMTP_USER && ZOHO_SMTP_PASS

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

export type PartnerEmailResult = {
  success: boolean
  provider: 'zoho' | 'resend' | 'none'
  messageId?: string
  error?: string
}

export async function sendPartnerOnboardingEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<PartnerEmailResult> {
  const fromEmail = ZOHO_FROM_EMAIL || FALLBACK_FROM_EMAIL
  const fromAddress = `"${EMAIL_FROM_NAME}" <${fromEmail}>`

  if (zohoTransporter) {
    try {
      const result = await zohoTransporter.sendMail({
        from: fromAddress,
        to,
        replyTo: fromEmail,
        subject: formatEmailSubject(subject),
        html,
        text,
      })

      return {
        success: true,
        provider: 'zoho',
        messageId: result.messageId,
      }
    } catch (error: any) {
      console.error('Zoho SMTP onboarding email error:', error)
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
        subject: formatEmailSubject(subject),
        html,
        text,
      })

      return {
        success: true,
        provider: 'resend',
        messageId: result.data?.id,
      }
    } catch (error: any) {
      console.error('Resend onboarding email error:', error)
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

