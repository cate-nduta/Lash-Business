import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import nodemailer from 'nodemailer'
import {
  RecipientType,
  ensureUnsubscribeToken,
  filterRecipients,
  getBusinessSettings,
  loadSubscribers,
  loadUnsubscribes,
  processLinks,
} from '@/lib/email-campaign-utils'
import { recordActivity } from '@/lib/activity-log'
import { existsSync } from 'fs'
import path from 'path'
import { sanitizeEmail, sanitizeOptionalText, sanitizeText, ValidationError } from '@/lib/input-validation'
import { NewsletterRecord } from '@/types/newsletter'
import { renderNewsletterHtml } from '@/lib/newsletter-renderer'
import { formatEmailSubject } from '@/lib/email-subject-utils'

// Zoho SMTP Configuration
const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com'
const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465)
const ZOHO_SMTP_USER = process.env.ZOHO_SMTP_USER || process.env.ZOHO_SMTP_USERNAME || process.env.ZOHO_USERNAME || ''
const ZOHO_SMTP_PASS = process.env.ZOHO_SMTP_PASS || process.env.ZOHO_SMTP_PASSWORD || process.env.ZOHO_APP_PASSWORD || ''
const ZOHO_FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_FROM || ZOHO_SMTP_USER || ''
const FROM_EMAIL = process.env.FROM_EMAIL || ZOHO_FROM_EMAIL || 'hello@lashdiary.co.ke'
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

const zohoTransporter = ZOHO_SMTP_USER && ZOHO_SMTP_PASS
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

interface SendRequestBody {
  newsletterId: string
  subject: string
  recipientType: RecipientType
  customRecipients?: Array<{ email: string; name: string }>
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    if (!zohoTransporter) {
      return NextResponse.json({ 
        error: 'Email service not configured',
        message: 'Please set up Zoho SMTP credentials in your .env.local file. Add: ZOHO_SMTP_USER, ZOHO_SMTP_PASS, and ZOHO_FROM_EMAIL',
      }, { status: 500 })
    }

    const body: SendRequestBody = await request.json()
    const {
      newsletterId: rawNewsletterId,
      subject: rawSubject,
      recipientType,
      customRecipients: rawCustomRecipients,
    } = body

    let newsletterId: string
    let subject: string
    let customRecipients: Array<{ email: string; name: string }> | undefined

    try {
      newsletterId = sanitizeText(rawNewsletterId, { fieldName: 'Newsletter ID', maxLength: 120 })
      subject = sanitizeText(rawSubject, { fieldName: 'Email subject', maxLength: 140 })
      if (Array.isArray(rawCustomRecipients)) {
        customRecipients = rawCustomRecipients.slice(0, 500).map((recipient, index) => ({
          email: sanitizeEmail(recipient?.email, `Custom recipient ${index + 1} email`),
          name:
            sanitizeOptionalText(recipient?.name, {
              fieldName: `Custom recipient ${index + 1} name`,
              maxLength: 80,
              optional: true,
            }) || 'Beautiful Soul',
        }))
      }
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        return NextResponse.json({ error: validationError.message }, { status: 400 })
      }
      throw validationError
    }

    if (!newsletterId || !subject) {
      return NextResponse.json({ error: 'Newsletter ID and subject are required' }, { status: 400 })
    }

    console.log('[Newsletter Send] Using subject:', subject)

    if (recipientType === 'custom' && (!customRecipients || customRecipients.length === 0)) {
      return NextResponse.json(
        { error: 'Custom recipients are required when using custom recipient type' },
        { status: 400 },
      )
    }

    // Load newsletter
    const newslettersData = await readDataFile<{ newsletters: NewsletterRecord[] }>('newsletters.json', {
      newsletters: [],
    })
    const newsletters = newslettersData.newsletters || []
    const newsletter = newsletters.find((n) => n.id === newsletterId)

    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
    }

    // Get recipients
    const subscribers = await loadSubscribers()
    if (subscribers.length === 0 && recipientType !== 'custom') {
      return NextResponse.json({ error: 'No subscribers found' }, { status: 400 })
    }

    let recipients = filterRecipients(recipientType, subscribers, customRecipients)
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found for the selected type' }, { status: 400 })
    }

    // Filter out unsubscribed
    const unsubscribeRecords = await loadUnsubscribes()
    const unsubscribedSet = new Set(
      unsubscribeRecords
        .filter((record) => record.unsubscribedAt)
        .map((record) => record.email.toLowerCase())
    )

    const skippedUnsubscribes: string[] = []
    recipients = recipients.filter((recipient) => {
      const isUnsubscribed = unsubscribedSet.has(recipient.email.toLowerCase())
      if (isUnsubscribed) {
        skippedUnsubscribes.push(recipient.email)
        return false
      }
      return true
    })

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          error: 'All recipients have unsubscribed. No emails were sent.',
          skippedUnsubscribes,
        },
        { status: 400 }
      )
    }

    // Check if we have image pages (preferred for email display)
    const hasImagePages = newsletter.imagePages && newsletter.imagePages.length > 0

    // Get business settings
    const business = await getBusinessSettings()
    const subscriberMap = new Map(subscribers.map((sub) => [sub.email.toLowerCase(), sub]))

    // Send emails
    const sendPromises = recipients.map(async (recipient) => {
      try {
        const subscriber =
          subscriberMap.get(recipient.email.toLowerCase()) ||
          ({ email: recipient.email, name: recipient.name, totalBookings: 0 } as any)

        const unsubscribeToken = await ensureUnsubscribeToken(recipient.email, recipient.name)
        const unsubscribeUrl = `${BASE_URL}/unsubscribe/${unsubscribeToken}`

        let compiledHtml = newsletter.contentHtml
        if ((!compiledHtml || compiledHtml.trim().length === 0) && newsletter.blocks && newsletter.blocks.length > 0) {
          compiledHtml = renderNewsletterHtml(newsletter.blocks, newsletter.themeId)
        }

        const emailHtml = createNewsletterEmailTemplate({
          newsletterTitle: newsletter.title,
          pdfUrl: newsletter.pdfUrl ? `${BASE_URL}${newsletter.pdfUrl}` : `${BASE_URL}/`,
          imagePages: newsletter.imagePages,
          contentHtml: compiledHtml,
          unsubscribeUrl,
          baseUrl: BASE_URL,
          newsletterId: newsletter.id,
          recipientEmail: recipient.email,
        })

        const replyToEmail = business.email || FROM_EMAIL

        // Prepare attachments - embed newsletter images as attachments for email clients
        const attachments: any[] = []
        
        if (hasImagePages && newsletter.imagePages) {
          // Embed each newsletter image as an attachment with CID for inline display
          for (const page of newsletter.imagePages) {
            const imagePath = path.join(process.cwd(), 'public', page.imageUrl)
            if (existsSync(imagePath)) {
              attachments.push({
                filename: `newsletter-page-${page.pageNumber}.png`,
                path: imagePath,
                cid: `newsletter-page-${page.pageNumber}`, // Content ID for inline embedding
              })
            }
          }
        }

        // Normalize business name - ensure it's "The LashDiary" if set to just "LashDiary"
        const rawBusinessName = business.name || 'The LashDiary'
        const fromName = rawBusinessName === 'LashDiary' ? 'The LashDiary' : rawBusinessName
        
        await zohoTransporter!.sendMail({
          from: `"${fromName}" <${FROM_EMAIL}>`,
          to: recipient.email,
          replyTo: replyToEmail,
          subject: formatEmailSubject(subject),
          html: emailHtml,
          attachments: attachments.length > 0 ? attachments : undefined,
        })
      } catch (err) {
        console.error(`Error sending newsletter to ${recipient.email}:`, err)
      }
    })

    await Promise.all(sendPromises)

    // Update newsletter record
    const newsletterIndex = newsletters.findIndex((n) => n.id === newsletterId)
    if (newsletterIndex !== -1) {
      newsletters[newsletterIndex] = {
        ...newsletters[newsletterIndex],
        sentAt: new Date().toISOString(),
        totalRecipients: recipients.length,
        opened: 0,
        clicked: 0,
      }
      await writeDataFile('newsletters.json', { newsletters })
    }

    await recordActivity({
      module: 'email',
      action: 'send',
      performedBy,
      summary: `Sent newsletter "${newsletter.title}"`,
      targetId: newsletterId,
      targetType: 'newsletter',
      details: {
        recipients: recipients.length,
        skippedUnsubscribes,
      },
    })

    return NextResponse.json({
      success: true,
      recipientsCount: recipients.length,
      skippedUnsubscribes,
    })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error sending newsletter:', error)
    return NextResponse.json({ error: 'Failed to send newsletter' }, { status: 500 })
  }
}

function createNewsletterEmailTemplate(options: {
  newsletterTitle: string
  pdfUrl: string
  imagePages?: Array<{
    pageNumber: number
    imageUrl: string
    width: number
    height: number
  }>
  contentHtml?: string | null
  unsubscribeUrl: string
  baseUrl: string
  newsletterId: string
  recipientEmail: string
}): string {
  const {
    newsletterTitle,
    pdfUrl,
    imagePages,
    contentHtml,
    unsubscribeUrl,
    baseUrl,
    newsletterId,
    recipientEmail,
  } = options

  const newsletterContent =
    (contentHtml && contentHtml.trim().length > 0 && contentHtml) ||
    (imagePages && imagePages.length > 0
      ? imagePages
          .map(
            (page) => `
        <tr>
          <td style="padding:8px 0;">
            <img 
              src="cid:newsletter-page-${page.pageNumber}" 
              alt="${newsletterTitle} - Page ${page.pageNumber}"
              style="display:block;width:100%;max-width:595px;height:auto;margin:0 auto;border:0;"
              width="595"
            />
          </td>
        </tr>
      `,
          )
          .join('')
      : `
        <tr>
          <td style="padding:40px 0;text-align:center;">
            <a href="${baseUrl}/api/admin/newsletters/track/click?newsletterId=${encodeURIComponent(
              newsletterId,
            )}&email=${encodeURIComponent(recipientEmail)}&url=${encodeURIComponent(pdfUrl)}" style="display:inline-block;padding:12px 32px;border-radius:999px;background:#2c1810;color:#ffffff;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;text-decoration:none;">
              View Newsletter
            </a>
          </td>
        </tr>
      `)

  const processedNewsletterContent = processLinks(newsletterContent, newsletterId, recipientEmail, baseUrl)
  const processedUnsubscribeLink = processLinks(
    `<a href="${unsubscribeUrl}" style="color:#8b6f47;text-decoration:underline;">Unsubscribe</a>`,
    newsletterId,
    recipientEmail,
    baseUrl,
  )

  const trackingPixel = `<img src="${baseUrl}/api/admin/newsletters/track/open?newsletterId=${encodeURIComponent(
    newsletterId,
  )}&email=${encodeURIComponent(recipientEmail)}" width="1" height="1" border="0" style="height:1px !important;width:1px !important;border-width:0 !important;margin-top:0 !important;margin-bottom:0 !important;margin-right:0 !important;margin-left:0 !important;padding-top:0 !important;padding-bottom:0 !important;padding-right:0 !important;padding-left:0 !important;"/>`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${newsletterTitle}</title>
  <style>
    body { margin:0; padding:0; background:#f5f1ed; }
    table { border-collapse:collapse; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f1ed;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation" style="background:#f5f1ed;">
    <tr>
      <td align="center" style="padding:24px 8px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;">
          ${processedNewsletterContent}
          <tr>
            <td style="padding:20px 12px;text-align:center;font-family:'Montserrat',Arial,sans-serif;font-size:12px;color:#6b5540;background:#f8f3ef;">
              ${processedUnsubscribeLink}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${trackingPixel}
</body>
</html>
  `.trim()
}


