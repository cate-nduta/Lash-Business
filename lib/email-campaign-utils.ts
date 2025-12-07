import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { createHash } from 'crypto'

export type RecipientType = 'all' | 'first-time' | 'returning' | 'custom'

export interface ManualSubscriber {
  email: string
  name: string
  source?: string
  createdAt: string
}

export interface SubscriberRecord {
  email: string
  name: string
  totalBookings: number
  lastBookingDate?: string
  nextBookingDate?: string
  nextBookingService?: string
  lastBookingService?: string
}

export interface CampaignAttachment {
  name: string
  url: string
  type: string
  size: number
}

export interface ScheduleOptions {
  enabled: boolean
  sendAt: string
}

export interface ABTestOptions {
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

export interface UnsubscribeRecord {
  email: string
  name?: string
  reason?: string
  token: string
  unsubscribedAt: string
}

interface BookingRecord {
  id: string
  name: string
  email: string
  service?: string
  date?: string
  timeSlot?: string
  createdAt?: string
}

const UNSUBSCRIBE_SECRET = process.env.EMAIL_UNSUBSCRIBE_SECRET || 'lashdiary-secret'

interface BusinessSettings {
  phone?: string
  email?: string
  name?: string
  address?: string
  description?: string
  logoUrl?: string
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  try {
    const settings = await readDataFile<any>('settings.json', {})
    return settings?.business || {
      phone: '',
      email: 'hello@lashdiary.co.ke',
      name: 'LashDiary',
      address: 'Nairobi, Kenya',
    }
  } catch {
    return {
      phone: '',
      email: 'hello@lashdiary.co.ke',
      name: 'LashDiary',
      address: 'Nairobi, Kenya',
    }
  }
}

export async function loadManualSubscribers(): Promise<ManualSubscriber[]> {
  try {
    const data = await readDataFile<{ subscribers: ManualSubscriber[] }>('email-subscribers.json', {
      subscribers: [],
    })
    return data.subscribers || []
  } catch {
    return []
  }
}

export async function loadSubscribers(): Promise<SubscriberRecord[]> {
  const bookingsData = await readDataFile<{ bookings: BookingRecord[] }>('bookings.json', { bookings: [] })
  const bookings = (bookingsData.bookings || []).filter((booking) => booking.email)
  const manualSubscribers = await loadManualSubscribers()
  const now = new Date()

  const map = new Map<string, SubscriberRecord>()

  bookings.forEach((booking) => {
    const email = booking.email.toLowerCase()
    const bookingDate = booking.timeSlot ? new Date(booking.timeSlot) : booking.date ? new Date(booking.date) : null
    const existing = map.get(email) || {
      email,
      name: booking.name || 'Beautiful Soul',
      totalBookings: 0,
      lastBookingDate: undefined,
      nextBookingDate: undefined,
      lastBookingService: undefined,
      nextBookingService: undefined,
    }

    existing.totalBookings += 1

    if (bookingDate) {
      if (bookingDate <= now) {
        if (!existing.lastBookingDate || new Date(existing.lastBookingDate) < bookingDate) {
          existing.lastBookingDate = bookingDate.toISOString()
          existing.lastBookingService = booking.service || existing.lastBookingService
        }
      } else {
        if (!existing.nextBookingDate || new Date(existing.nextBookingDate) > bookingDate) {
          existing.nextBookingDate = bookingDate.toISOString()
          existing.nextBookingService = booking.service || existing.nextBookingService
        }
      }
    }

    map.set(email, existing)
  })

  manualSubscribers.forEach((subscriber) => {
    const email = subscriber.email.toLowerCase()
    if (!map.has(email)) {
      map.set(email, {
        email,
        name: subscriber.name || 'Beautiful Soul',
        totalBookings: 0,
      })
    }
  })

  return Array.from(map.values())
}

export async function loadUnsubscribes(): Promise<UnsubscribeRecord[]> {
  try {
    const data = await readDataFile<{ unsubscribes: UnsubscribeRecord[] }>('email-unsubscribes.json', {
      unsubscribes: [],
    })
    return data.unsubscribes || []
  } catch {
    return []
  }
}

export async function saveUnsubscribes(records: UnsubscribeRecord[]) {
  await writeDataFile('email-unsubscribes.json', { unsubscribes: records })
}

export async function ensureUnsubscribeToken(email: string, name?: string): Promise<string> {
  const normalizedEmail = email.toLowerCase()
  const unsubscribes = await loadUnsubscribes()
  const existing = unsubscribes.find((record) => record.email.toLowerCase() === normalizedEmail)
  if (existing) {
    return existing.token
  }

  const token = createHash('sha256').update(`${normalizedEmail}-${UNSUBSCRIBE_SECRET}`).digest('hex')
  unsubscribes.push({ email, name, token, reason: undefined, unsubscribedAt: '' })
  await saveUnsubscribes(unsubscribes)
  return token
}

export function buildAttachmentPayload(attachments?: CampaignAttachment[]) {
  if (!attachments || attachments.length === 0) return undefined
  return attachments
    .map((attachment) => {
      const filePath = path.join(process.cwd(), 'public', attachment.url.replace(/^[\\/]+/, ''))
      if (!existsSync(filePath)) return null
      const content = readFileSync(filePath).toString('base64')
      return {
        filename: attachment.name,
        content,
      }
    })
    .filter(Boolean) as Array<{ filename: string; content: string }>
}

export async function applyPersonalizationTokens(
  content: string,
  subscriber: SubscriberRecord,
  business?: BusinessSettings
): Promise<string> {
  const resolvedBusiness = business || (await getBusinessSettings())

  const tokenMap: Record<string, string> = {
    '{name}': subscriber.name || 'Beautiful Soul',
    '{email}': subscriber.email,
    '{phone}': resolvedBusiness.phone || '',
    '{businessName}': resolvedBusiness.name || 'LashDiary',
    '{lastVisit}': subscriber.lastBookingDate
      ? new Date(subscriber.lastBookingDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Not yet visited',
    '{totalVisits}': subscriber.totalBookings.toString(),
    '{appointmentDate}': subscriber.nextBookingDate
      ? new Date(subscriber.nextBookingDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Not yet scheduled',
    '{appointmentTime}': subscriber.nextBookingDate
      ? new Date(subscriber.nextBookingDate).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'TBD',
    '{serviceName}': subscriber.nextBookingService || subscriber.lastBookingService || 'Signature Lash Service',
  }

  let personalized = content
  Object.entries(tokenMap).forEach(([token, value]) => {
    const regex = new RegExp(token.replace(/[{}]/g, '\\$&'), 'g')
    personalized = personalized.replace(regex, value)
  })
  return personalized
}

export async function personalizeSubject(
  subject: string,
  subscriber: SubscriberRecord,
  business?: BusinessSettings
): Promise<string> {
  return applyPersonalizationTokens(subject, subscriber, business)
}

export async function createEmailTemplate(options: {
  content: string
  campaignId: string
  recipientEmail: string
  unsubscribeToken: string
  baseUrl: string
  business?: BusinessSettings
}): Promise<string> {
  const { content, campaignId, recipientEmail, unsubscribeToken, baseUrl, business } = options
  const resolvedBusiness = business || (await getBusinessSettings())
  const unsubscribeUrl = `${baseUrl}/unsubscribe/${unsubscribeToken}`
  const brandName = resolvedBusiness.name || 'LashDiary'
  const businessAddress = resolvedBusiness.address || 'Nairobi, Kenya'
  const displayUrl = baseUrl.replace(/^https?:\/\//, '')

  // Use the same email styles as booking emails
  const EMAIL_STYLES = {
    background: '#FDF9F4',
    card: '#FFFFFF',
    accent: '#F3E6DC',
    textPrimary: '#3E2A20',
    textSecondary: '#6B4A3B',
    brand: '#7C4B31',
  }

  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES

  // Convert content to safe HTML (preserve line breaks)
  const safeContent = content.replace(/\n/g, '<br>')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Serif+Text&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background:${background}; font-family: 'DM Serif Text', Georgia, serif; color:${textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${card}; border-radius:18px; border:1px solid ${accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${card};">
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">${brandName}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <div style="font-size:16px; line-height:1.8; color:${textPrimary}; font-family:'DM Serif Text', Georgia, serif;">
                ${safeContent}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center;">
              <p style="margin:0; font-size:13px; color:${textSecondary};">Questions? Reply directly to this email and we'll take care of you.</p>
              <p style="margin:8px 0 0 0; font-size:12px; color:${textSecondary};">
                ${brandName} • ${businessAddress} • <a href="${baseUrl}" style="color:${brand}; text-decoration:none;">${displayUrl}</a>
              </p>
              <p style="margin:12px 0 0 0; font-size:11px; color:${textSecondary};">
                You're receiving this email because you opted in for ${brandName} updates. <a href="${unsubscribeUrl}" style="color:${brand}; text-decoration:underline;">Unsubscribe</a>
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

export function processLinks(content: string, campaignId: string, email: string, baseUrl: string) {
  return content.replace(/href="(.*?)"/g, (match, url) => {
    if (!url || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return match
    }
    const encoded = encodeURIComponent(url)
    return `href="${baseUrl}/api/admin/email-marketing/track/click?campaignId=${campaignId}&email=${encodeURIComponent(
      email
    )}&url=${encoded}"`
  })
}

export function filterRecipients(
  recipientType: RecipientType,
  subscribers: SubscriberRecord[],
  customRecipients?: Array<{ email: string; name: string }>
) {
  if (recipientType === 'custom' && customRecipients?.length) {
    return customRecipients.map((recipient) => ({
      email: recipient.email.toLowerCase(),
      name: recipient.name || 'Beautiful Soul',
    }))
  }

  if (recipientType === 'all') {
    return subscribers.map((subscriber) => ({
      email: subscriber.email,
      name: subscriber.name,
    }))
  }

  if (recipientType === 'first-time') {
    return subscribers
      .filter((subscriber) => subscriber.totalBookings === 1)
      .map((subscriber) => ({ email: subscriber.email, name: subscriber.name }))
  }

  return subscribers
    .filter((subscriber) => subscriber.totalBookings > 1)
    .map((subscriber) => ({ email: subscriber.email, name: subscriber.name }))
}

