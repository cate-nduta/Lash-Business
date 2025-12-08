import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import nodemailer from 'nodemailer'
import { formatEmailSubject } from '@/lib/email-subject-utils'
import {
  CampaignAttachment,
  RecipientType,
  applyPersonalizationTokens,
  personalizeSubject,
  buildAttachmentPayload,
  createEmailTemplate,
  ensureUnsubscribeToken,
  getBusinessSettings,
  loadSubscribers,
  loadUnsubscribes,
  processLinks,
} from '@/lib/email-campaign-utils'

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
const OWNER_EMAIL = process.env.CALENDAR_EMAIL || process.env.FROM_EMAIL || BUSINESS_NOTIFICATION_EMAIL

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

interface ScheduledEmailEntry {
  id: string
  subject: string
  content: string
  recipientType: RecipientType
  recipients: Array<{ email: string; name: string }>
  attachments?: CampaignAttachment[]
  excludeUnsubscribed: boolean
  schedule: {
    enabled: boolean
    sendAt: string
  }
  abTest?: {
    enabled: boolean
    samplePercentage: number
    metric: 'open' | 'click'
    variantA: {
      subject: string
      content: string
    }
    variantB: {
      subject: string
      content: string
    }
  }
  createdAt: string
}

interface EmailCampaign {
  id: string
  subject: string
  content: string
  recipientType: RecipientType
  sentAt: string | null
  createdAt: string
  totalRecipients: number
  opened: number
  clicked: number
  notOpened: number
  attachments?: CampaignAttachment[]
  scheduleStatus?: 'scheduled' | 'sent' | 'cancelled'
  scheduleSendAt?: string | null
  abParentId?: string
  variant?: 'A' | 'B'
}

async function loadScheduledEmails(): Promise<ScheduledEmailEntry[]> {
  try {
    const data = await readDataFile<{ scheduled: ScheduledEmailEntry[] }>('scheduled-emails.json', {
      scheduled: [],
    })
    return data.scheduled || []
  } catch {
    return []
  }
}

async function saveScheduledEmails(entries: ScheduledEmailEntry[]) {
  await writeDataFile('scheduled-emails.json', { scheduled: entries })
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    if (!zohoTransporter) {
      return NextResponse.json({ error: 'Email service not configured. Please set up ZOHO_SMTP credentials.' }, { status: 500 })
    }

    const scheduledEntries = await loadScheduledEmails()
    const now = new Date()

    const dueEntries = scheduledEntries.filter((entry) => {
      const sendAt = new Date(entry.schedule.sendAt)
      return sendAt.getTime() <= now.getTime()
    })

    if (dueEntries.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No scheduled emails ready to send.' })
    }

    const remainingEntries = scheduledEntries.filter((entry) => !dueEntries.includes(entry))
    const business = await getBusinessSettings()
    const campaignsData = await readDataFile<{ campaigns: EmailCampaign[] }>('email-campaigns.json', {
      campaigns: [],
    })
    const campaigns = campaignsData.campaigns || []

    const subscribers = await loadSubscribers()
    const subscriberMap = new Map(subscribers.map((subscriber) => [subscriber.email.toLowerCase(), subscriber]))
    const unsubscribeRecords = await loadUnsubscribes()
    const unsubscribedSet = new Set(
      unsubscribeRecords
        .filter((record) => record.unsubscribedAt)
        .map((record) => record.email.toLowerCase())
    )

    for (const entry of dueEntries) {
      let recipients = entry.recipients
      if (entry.excludeUnsubscribed) {
        recipients = recipients.filter((recipient) => !unsubscribedSet.has(recipient.email.toLowerCase()))
      }

      if (recipients.length === 0) {
        continue
      }

      const campaignId = entry.id
      const attachmentPayload = buildAttachmentPayload(entry.attachments)

      const promises = recipients.map(async (recipient) => {
        try {
          const subscriber =
            subscriberMap.get(recipient.email.toLowerCase()) ||
            ({ email: recipient.email, name: recipient.name, totalBookings: 0 } as any)

          const personalizedSubject = await personalizeSubject(entry.subject, subscriber, business)
          const personalizedContent = await applyPersonalizationTokens(entry.content, subscriber, business)
          const trackedContent = processLinks(personalizedContent, campaignId, recipient.email, BASE_URL)
          const unsubscribeToken = await ensureUnsubscribeToken(recipient.email, recipient.name)
          const emailHtml = await createEmailTemplate({
            content: trackedContent,
            campaignId,
            recipientEmail: recipient.email,
            unsubscribeToken,
            baseUrl: BASE_URL,
            business,
          })

          const replyToEmail = business.email || OWNER_EMAIL

          await zohoTransporter.sendMail({
            from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
            to: recipient.email,
            replyTo: replyToEmail,
            subject: formatEmailSubject(personalizedSubject),
            html: emailHtml,
            attachments: attachmentPayload,
          })
        } catch (error) {
          console.error(`Error sending scheduled email to ${recipient.email}:`, error)
        }
      })

      await Promise.all(promises)

      campaigns.push({
        id: campaignId,
        subject: entry.subject,
        content: entry.content,
        recipientType: entry.recipientType,
        sentAt: new Date().toISOString(),
        createdAt: entry.createdAt,
        totalRecipients: recipients.length,
        opened: 0,
        clicked: 0,
        notOpened: recipients.length,
        attachments: entry.attachments,
        scheduleStatus: 'sent',
        scheduleSendAt: entry.schedule.sendAt,
      })
    }

    await writeDataFile('email-campaigns.json', { campaigns })
    await saveScheduledEmails(remainingEntries)

    return NextResponse.json({ processed: dueEntries.length })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error processing scheduled emails:', error)
    return NextResponse.json({ error: 'Failed to process scheduled emails' }, { status: 500 })
  }
}
