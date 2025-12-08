import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import nodemailer from 'nodemailer'
import { formatEmailSubject } from '@/lib/email-subject-utils'
import {
  ABTestOptions,
  CampaignAttachment,
  RecipientType,
  ScheduleOptions,
  applyPersonalizationTokens,
  personalizeSubject,
  buildAttachmentPayload,
  createEmailTemplate,
  ensureUnsubscribeToken,
  filterRecipients,
  getBusinessSettings,
  loadSubscribers,
  loadUnsubscribes,
  processLinks,
} from '@/lib/email-campaign-utils'
import { recordActivity } from '@/lib/activity-log'

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
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'The LashDiary'

// Zoho transporter (primary email service)
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

interface SendRequestBody {
  subject: string
  content: string
  recipientType: RecipientType
  customRecipients?: Array<{ email: string; name: string }>
  attachments?: CampaignAttachment[]
  schedule?: ScheduleOptions
  abTest?: ABTestOptions
  excludeUnsubscribed?: boolean
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

interface ScheduledEmailEntry {
  id: string
  subject: string
  content: string
  recipientType: RecipientType
  recipients: Array<{ email: string; name: string }>
  attachments?: CampaignAttachment[]
  excludeUnsubscribed: boolean
  schedule: ScheduleOptions
  abTest?: ABTestOptions
  createdAt: string
}

async function queueScheduledEmail(entry: ScheduledEmailEntry) {
  const scheduledData = await readDataFile<{ scheduled: ScheduledEmailEntry[] }>('scheduled-emails.json', { scheduled: [] })
  const scheduled = scheduledData.scheduled || []
  scheduled.push(entry)
  await writeDataFile('scheduled-emails.json', { scheduled })
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    // Check if Zoho is configured
    if (!zohoTransporter) {
      return NextResponse.json({ 
        error: 'Email service not configured. Please set up ZOHO_SMTP credentials (ZOHO_SMTP_USER and ZOHO_SMTP_PASS).' 
      }, { status: 500 })
    }

    const body: SendRequestBody = await request.json()
    const { subject, content, recipientType, attachments, schedule, abTest, customRecipients } = body

    if (!subject || !content) {
      return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 })
    }

    const subscribers = await loadSubscribers()
    if (subscribers.length === 0 && recipientType !== 'custom') {
      return NextResponse.json({ error: 'No subscribers found' }, { status: 400 })
    }

    const subscriberMap = new Map(subscribers.map((subscriber) => [subscriber.email.toLowerCase(), subscriber]))

    let recipients = filterRecipients(recipientType, subscribers, customRecipients)
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found for the selected type' }, { status: 400 })
    }

    const unsubscribeRecords = await loadUnsubscribes()
    const unsubscribedSet = new Set(
      unsubscribeRecords
        .filter((record) => record.unsubscribedAt)
        .map((record) => record.email.toLowerCase())
    )

    const excludeUnsubscribed = body.excludeUnsubscribed !== false
    const skippedUnsubscribes: string[] = []

    if (excludeUnsubscribed) {
      recipients = recipients.filter((recipient) => {
        const isUnsubscribed = unsubscribedSet.has(recipient.email.toLowerCase())
        if (isUnsubscribed) {
          skippedUnsubscribes.push(recipient.email)
          return false
        }
        return true
      })
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          error: 'All recipients have unsubscribed. No emails were sent.',
          skippedUnsubscribes,
        },
        { status: 400 }
      )
    }

    if (schedule?.enabled) {
      const sendAt = new Date(schedule.sendAt)
      const now = new Date()
      if (isNaN(sendAt.getTime())) {
        return NextResponse.json({ error: 'Invalid schedule date' }, { status: 400 })
      }

      if (sendAt.getTime() > now.getTime() + 60 * 1000) {
        const scheduledEntry: ScheduledEmailEntry = {
          id: `scheduled-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          subject,
          content,
          recipientType,
          recipients,
          attachments,
          excludeUnsubscribed,
          schedule,
          abTest,
          createdAt: now.toISOString(),
        }

        await queueScheduledEmail(scheduledEntry)

        const campaignsData = await readDataFile<{ campaigns: EmailCampaign[] }>('email-campaigns.json', {
          campaigns: [],
        })
        const campaigns = campaignsData.campaigns || []
        const campaign: EmailCampaign = {
          id: scheduledEntry.id,
          subject,
          content,
          recipientType,
          sentAt: null,
          createdAt: now.toISOString(),
          totalRecipients: recipients.length,
          opened: 0,
          clicked: 0,
          notOpened: recipients.length,
          attachments,
          scheduleStatus: 'scheduled',
          scheduleSendAt: sendAt.toISOString(),
        }
        campaigns.push(campaign)
        await writeDataFile('email-campaigns.json', { campaigns })

        await recordActivity({
          module: 'email_marketing',
          action: 'schedule',
          performedBy,
          summary: `Scheduled campaign "${subject}"`,
          targetId: scheduledEntry.id,
          targetType: 'email_campaign',
          details: {
            sendAt: sendAt.toISOString(),
            recipients: recipients.length,
            skippedUnsubscribes,
          },
        })

        return NextResponse.json({
          success: true,
          scheduled: true,
          scheduleId: scheduledEntry.id,
          sendAt: sendAt.toISOString(),
          recipientsCount: recipients.length,
          skippedUnsubscribes,
        })
      }
    }

    const campaignsData = await readDataFile<{ campaigns: EmailCampaign[] }>('email-campaigns.json', {
      campaigns: [],
    })
    const campaigns = campaignsData.campaigns || []
    const business = await getBusinessSettings()
    const attachmentPayload = buildAttachmentPayload(attachments)
    const baseCampaignId = `campaign-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    const sendVariant = async (
      campaignId: string,
      campaignSubject: string,
      campaignContent: string,
      variantRecipients: Array<{ email: string; name: string }>,
      variant?: 'A' | 'B',
      parentId?: string
    ) => {
      const record: EmailCampaign = {
        id: campaignId,
        subject: campaignSubject,
        content: campaignContent,
        recipientType,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        totalRecipients: variantRecipients.length,
        opened: 0,
        clicked: 0,
        notOpened: variantRecipients.length,
        attachments,
        scheduleStatus: 'sent',
        variant,
        abParentId: parentId,
      }

      campaigns.push(record)

      // Send emails in batches to avoid overwhelming the email service
      const BATCH_SIZE = 10
      let sentCount = 0
      let errorCount = 0
      
      for (let i = 0; i < variantRecipients.length; i += BATCH_SIZE) {
        const batch = variantRecipients.slice(i, i + BATCH_SIZE)
        const batchPromises = batch.map(async (recipient) => {
          try {
            const subscriber =
              subscriberMap.get(recipient.email.toLowerCase()) ||
              ({ email: recipient.email, name: recipient.name, totalBookings: 0 } as any)

            const personalizedSubject = await personalizeSubject(campaignSubject, subscriber, business)
            const personalized = await applyPersonalizationTokens(campaignContent, subscriber, business)
            const tracked = processLinks(personalized, campaignId, recipient.email, BASE_URL)
            const unsubscribeToken = await ensureUnsubscribeToken(recipient.email, recipient.name)
            const emailHtml = await createEmailTemplate({
              content: tracked,
              campaignId,
              recipientEmail: recipient.email,
              unsubscribeToken,
              baseUrl: BASE_URL,
              business,
            })

            const replyToEmail = business.email || OWNER_EMAIL
            const formattedSubject = formatEmailSubject(personalizedSubject)
            const fromName = business.name || EMAIL_FROM_NAME

            // Send email via Zoho SMTP
            if (zohoTransporter) {
              try {
                await zohoTransporter.sendMail({
                  from: `"${fromName}" <${FROM_EMAIL}>`,
                  to: recipient.email,
                  replyTo: replyToEmail,
                  subject: formattedSubject,
                  html: emailHtml,
                  attachments: attachmentPayload ? attachmentPayload.map((att: any) => ({
                    filename: att.filename,
                    content: att.content,
                    encoding: 'base64',
                  })) : undefined,
                })
                console.log(`✅ Email sent via Zoho SMTP to ${recipient.email}`)
                sentCount++
              } catch (emailError: any) {
                console.error(`Zoho SMTP error for ${recipient.email}:`, emailError)
                throw emailError
              }
            } else {
              throw new Error('Email service not configured')
            }
          } catch (err) {
            console.error(`❌ Error sending email to ${recipient.email}:`, err)
            errorCount++
            // Continue sending to other recipients even if one fails
          }
        })

        await Promise.all(batchPromises)
        console.log(`📧 Batch ${Math.floor(i / BATCH_SIZE) + 1}: Processed ${batch.length} emails (${sentCount} sent, ${errorCount} errors)`)
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < variantRecipients.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      console.log(`✅ Campaign ${campaignId} complete: ${sentCount} sent, ${errorCount} errors out of ${variantRecipients.length} recipients`)
    }

    if (abTest?.enabled) {
      const samplePercentage = Math.min(Math.max(abTest.samplePercentage || 20, 10), 50)
      const sampleSize = Math.max(1, Math.floor((recipients.length * samplePercentage) / 100))
      const shuffled = [...recipients].sort(() => Math.random() - 0.5)
      const testRecipients = shuffled.slice(0, sampleSize * 2)
      const remainder = shuffled.slice(sampleSize * 2)

      const groupA = testRecipients.slice(0, sampleSize)
      const groupB = testRecipients.slice(sampleSize, sampleSize * 2)

      await sendVariant(`${baseCampaignId}-A`, abTest.variantA.subject, abTest.variantA.content, groupA, 'A', baseCampaignId)
      await sendVariant(`${baseCampaignId}-B`, abTest.variantB.subject, abTest.variantB.content, groupB, 'B', baseCampaignId)

      if (remainder.length > 0) {
        await sendVariant(`${baseCampaignId}-Remainder`, subject, content, remainder, undefined, baseCampaignId)
      }
    } else {
      await sendVariant(baseCampaignId, subject, content, recipients)
    }

    await writeDataFile('email-campaigns.json', { campaigns })

    await recordActivity({
      module: 'email_marketing',
      action: 'send',
      performedBy,
      summary: `Sent campaign "${subject}"`,
      targetId: baseCampaignId,
      targetType: 'email_campaign',
      details: {
        recipients: recipients.length,
        skippedUnsubscribes,
        abTestEnabled: !!abTest?.enabled,
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
    console.error('Error sending email campaign:', error)
    return NextResponse.json({ error: 'Failed to send email campaign' }, { status: 500 })
  }
}

