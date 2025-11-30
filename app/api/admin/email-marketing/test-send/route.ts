import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { Resend } from 'resend'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import { personalizeSubject, applyPersonalizationTokens, getBusinessSettings } from '@/lib/email-campaign-utils'
import { formatEmailSubject } from '@/lib/email-subject-utils'
import type { SubscriberRecord } from '@/lib/email-campaign-utils'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = process.env.CALENDAR_EMAIL || 'hello@lashdiary.co.ke'
const UNSUBSCRIBE_SECRET = process.env.EMAIL_UNSUBSCRIBE_SECRET || 'lashdiary-secret'
const OWNER_EMAIL = process.env.CALENDAR_EMAIL || process.env.FROM_EMAIL || 'hello@lashdiary.co.ke'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

interface CampaignAttachment {
  name: string
  url: string
  type: string
  size: number
}

function buildAttachmentPayload(attachments?: CampaignAttachment[]) {
  if (!attachments || attachments.length === 0) return undefined
  return attachments
    .map((attachment) => {
      const filePath = path.join(process.cwd(), 'public', attachment.url.replace(/^[\\\/]+/, ''))
      if (!existsSync(filePath)) {
        return null
      }
      const content = readFileSync(filePath).toString('base64')
      return {
        filename: attachment.name,
        content,
      }
    })
    .filter(Boolean) as Array<{ filename: string; content: string }>
}

async function createEmailPreview(content: string, unsubscribeToken: string) {
  const business = await getBusinessSettings()
  const unsubscribeUrl = `${BASE_URL}/unsubscribe/${unsubscribeToken}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${business.name || 'LashDiary'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #FDF7FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF7FA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 22px 55px -18px rgba(115, 61, 38, 0.12); border: 1px solid #F6D7E5;">
          <tr>
            <td style="background: linear-gradient(135deg, #FAD4E6 0%, #FBE9EF 50%, #FFFFFF 100%); padding: 44px 32px; text-align: center;">
              <div style="font-size: 14px; letter-spacing: 0.24em; text-transform: uppercase; color: #9B5B72; font-weight: 600; margin-bottom: 12px;">
                ${business.description || 'Luxury Lash & Beauty Studio'}
              </div>
              <h1 style="color: #4F2C1D; margin: 0; font-size: 36px; font-weight: 800; letter-spacing: 0.04em;">
                ${business.name || 'LashDiary'}
              </h1>
              <p style="margin: 14px 0 0; font-size: 16px; color: #7B485C; line-height: 1.7;">
                Personalized lash artistry, delivered with love and elegance.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 36px 40px 32px 40px;">
                    <div style="
                      background-color: #FFF3F8;
                      border-radius: 22px;
                      padding: 32px 34px;
                      border: 1px solid rgba(154, 92, 114, 0.15);
                    ">
                      <div style="color: #4F2C1D; font-size: 16px; line-height: 1.8;">
                        ${content.replace(/\n/g, '<br>')}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
                <tr>
                  <td style="height: 1px; background-color: #F6D7E5;"></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 36px 40px;">
              <p style="font-size: 15px; color: #7B485C; margin: 0 0 10px 0; line-height: 1.7;">
                With love and gratitude,
              </p>
              <p style="font-size: 17px; color: #4F2C1D; font-weight: 700; margin: 0 0 20px 0;">
                The ${business.name || 'LashDiary'} Team
              </p>
              <a
                href="${BASE_URL}"
                style="
                  display: inline-block;
                  padding: 14px 26px;
                  background: linear-gradient(135deg, #F6A9C5 0%, #EE7AA7 100%);
                  color: #ffffff;
                  text-decoration: none;
                  font-weight: 600;
                  border-radius: 999px;
                  box-shadow: 0 12px 25px rgba(238, 122, 167, 0.3);
                  letter-spacing: 0.03em;
                  font-size: 14px;
                "
              >
                Visit ${business.name || 'LashDiary'}
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FDF1F6; padding: 28px 32px; text-align: center;">
              <p style="font-size: 13px; color: #9B5B72; margin: 0 0 8px 0;">
                Questions or special requests? Reply to this email and we’ll be happy to help.
              </p>
              <p style="font-size: 12px; color: #B07A8F; margin: 0;">
                ${business.name || 'LashDiary'} • ${business.address || 'Nairobi, Kenya'} • <a href="${BASE_URL}" style="color: #B07A8F; text-decoration: underline;">${BASE_URL.replace(/^https?:\/\//, '')}</a>
              </p>
              <p style="font-size: 11px; color: #C295A8; margin: 12px 0 0;">
                You are receiving this email because you opted in for ${business.name || 'LashDiary'} updates. <a href="${unsubscribeUrl}" style="color:#B07A8F;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="height: 8px;"></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function ensureToken(email: string) {
  return createHash('sha256').update(`${email.toLowerCase()}-${UNSUBSCRIBE_SECRET}`).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    if (!resend) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { subject, content, toEmail, attachments, previewSubscriber } = body as {
      subject: string
      content: string
      toEmail?: string
      attachments?: CampaignAttachment[]
      previewSubscriber?: {
        name?: string
        email?: string
        totalBookings?: number
        lastBookingDate?: string
        nextBookingDate?: string
        nextBookingService?: string
        lastBookingService?: string
      }
    }

    if (!subject || !content) {
      return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 })
    }

    if (toEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const targetEmail = (toEmail as string | undefined)?.trim() || TEST_EMAIL

    const sampleSubscriber: SubscriberRecord = previewSubscriber
      ? {
          email: previewSubscriber.email || targetEmail,
          name: previewSubscriber.name || 'Catherine N.',
          totalBookings: previewSubscriber.totalBookings ?? 0,
          lastBookingDate: previewSubscriber.lastBookingDate,
          nextBookingDate: previewSubscriber.nextBookingDate,
          nextBookingService: previewSubscriber.nextBookingService,
          lastBookingService: previewSubscriber.lastBookingService,
        }
      : {
          name: 'Catherine N.',
          email: targetEmail,
          totalBookings: 3,
          lastBookingDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          nextBookingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          nextBookingService: 'Volume Lash Fill',
          lastBookingService: 'Classic Lashes',
        }

    const business = await getBusinessSettings()

    const personalizedSubject = await personalizeSubject(subject, sampleSubscriber, business)
    const personalizedContent = await applyPersonalizationTokens(content, sampleSubscriber, business)

    const attachmentPayload = buildAttachmentPayload(attachments)

    const unsubscribeToken = ensureToken(targetEmail)
    const emailHtml = await createEmailPreview(personalizedContent, unsubscribeToken)

    try {
      const replyToEmail = business.email || OWNER_EMAIL

      await resend.emails.send({
        from: `${business.name || 'LashDiary'} <${FROM_EMAIL}>`,
        to: targetEmail,
        replyTo: replyToEmail,
        subject: formatEmailSubject(personalizedSubject),
        html: emailHtml,
        attachments: attachmentPayload,
      })
    } catch (error) {
      console.error('Error sending test email:', error)
      return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${targetEmail}`,
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}

