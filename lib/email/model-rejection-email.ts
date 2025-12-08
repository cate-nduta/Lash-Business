/**
 * Model Rejection Email Template
 * 
 * Sends a professional and empathetic rejection email to model applicants
 * when all slots are filled or they are not selected for this round.
 */

import nodemailer from 'nodemailer'

const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'
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
const EMAIL_FROM_NAME = 'The LashDiary'
const BASE_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || ''
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return `https://${trimmed}`
  }
  return 'https://lashdiary.co.ke'
})()

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

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Create rejection email HTML template
function createRejectionEmailTemplate(firstName: string, personalNote?: string): string {
  const safeFirstName = escapeHtml(firstName || 'there')
  const safePersonalNote = personalNote ? escapeHtml(personalNote) : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LashDiary Model Application Update</title>
</head>
<body style="margin:0; padding:0; background:#FDF9F4; font-family: 'DM Serif Text', Georgia, serif; color:#7C4B31;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FDF9F4; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:#FFFFFF; border-radius:18px; border:1px solid #E8D5C4; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:#FFFFFF;">
              <h1 style="margin:0; font-size:32px; color:#7C4B31; font-family:'Playfair Display', Georgia, serif; font-weight:600;">LashDiary Model Application Update</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                Hey ${safeFirstName},
              </p>
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                Thank you for taking the time to apply to be a LashDiary model. I truly appreciate your interest and your willingness to be part of this project.
              </p>
              
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                I had limited availability for model slots this round, and all available spots have been filled. Because of the high number of applications, I wasn't able to include everyone this time.
              </p>
              
              ${safePersonalNote ? '<div style="background:#F5F1EB; border-left:4px solid #7C4B31; padding:16px; margin:20px 0; border-radius:8px;"><p style="margin:0; font-size:15px; line-height:1.6; color:#7C4B31; white-space:pre-wrap;">' + safePersonalNote.replace(/\n/g, '<br>') + '</p></div>' : ''}
              
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                I'll be opening more opportunities in the future, and you're welcome to apply again when the next round is announced.
              </p>
              
              <p style="margin:18px 0 0 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                Thank you again for your support. It means a lot to me that you took the time to apply and share your interest in being part of the LashDiary community.
              </p>
              
              <p style="margin:24px 0 8px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                If you have any questions or would like to stay updated on future opportunities, feel free to reach out.
              </p>
              
              <p style="margin:12px 0 0 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                Wishing you all the best,
              </p>
              <p style="margin:4px 0 0 0; font-size:16px; line-height:1.6; color:#7C4B31; font-weight:600;">
                🤎 The LashDiary Team
              </p>
              
              <div style="margin:28px 0; text-align:center;">
                <a href="${BASE_URL}/booking" style="display:inline-block; padding:12px 28px; background:#7C4B31; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:15px;">
                  Book a Regular Appointment
                </a>
              </div>
              
              <p style="margin:12px 0 0 0; font-size:13px; color:#7C4B31; text-align:center; line-height:1.6;">
                While you wait for the next model opportunity, we'd love to have you as a regular client!<br>
                Experience our premium lash services and join our beautiful community.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding:24px 32px; background:#FDF9F4; text-align:center; border-top:1px solid #E8D5C4;">
              <p style="margin:0; font-size:13px; color:#7C4B31;">
                <a href="${BASE_URL}" style="color:#7C4B31; text-decoration:none;">Visit Our Website</a> | 
                <a href="${BASE_URL}/contact" style="color:#7C4B31; text-decoration:none;">Contact Us</a>
              </p>
              <p style="margin:8px 0 0 0; font-size:12px; color:#7C4B31; opacity:0.8;">
                © ${new Date().getFullYear()} LashDiary. All rights reserved.
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

export async function sendModelRejectionEmail(data: {
  email: string
  firstName: string
  personalNote?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!zohoTransporter) {
    return {
      success: false,
      error: 'Email service not configured. Please set ZOHO_SMTP_USER and ZOHO_SMTP_PASS in your environment variables.',
    }
  }

  try {
    const emailHtml = createRejectionEmailTemplate(data.firstName, data.personalNote)
    
    const info = await zohoTransporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.email,
      subject: 'LashDiary Model Application Update',
      html: emailHtml,
      replyTo: BUSINESS_NOTIFICATION_EMAIL,
    })

    console.log('Model rejection email sent successfully:', info.messageId)
    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error: any) {
    console.error('Error sending model rejection email:', error)
    return {
      success: false,
      error: error?.message || String(error),
    }
  }
}

