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
  const brandTagline = resolvedBusiness.description || 'Luxury Lash Extensions & Beauty Services'
  const businessAddress = resolvedBusiness.address || 'Nairobi, Kenya'
  const displayUrl = baseUrl.replace(/^https?:\/\//, '')

  const safeContent = content.replace(/\n/g, '<br>')

  const absoluteLogoUrl = resolvedBusiness.logoUrl
    ? resolvedBusiness.logoUrl.startsWith('http')
      ? resolvedBusiness.logoUrl
      : `${baseUrl.replace(/\/$/, '')}${resolvedBusiness.logoUrl.startsWith('/') ? '' : '/'}${resolvedBusiness.logoUrl}`
    : ''

  const logoMarkup = absoluteLogoUrl
    ? `<img src="${absoluteLogoUrl}" alt="${brandName} logo" width="64" style="display:block;height:auto;border:0;max-width:64px;">`
    : `<span style="display:inline-block;font-family:'Montserrat','Trebuchet MS',sans-serif;font-size:24px;font-weight:700;letter-spacing:0.08em;color:#2C2B2B;text-transform:uppercase;">${brandName}</span>`

  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brandName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" type="text/css" />
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #fdeef1;
      font-family: 'Open Sans', 'Helvetica Neue', Arial, sans-serif;
      color: #2c2b2b;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: #7a6cff;
      text-decoration: none;
    }
    .desktop-hide {
      display: none;
      max-height: 0;
      overflow: hidden;
    }
    @media only screen and (max-width: 700px) {
      .row-content {
        width: 100% !important;
      }
      .stack .column {
        width: 100% !important;
        display: block !important;
      }
      .desktop-hide {
        display: block !important;
        max-height: none !important;
      }
      .hero-title {
        font-size: 30px !important;
      }
      .hero-subtitle {
        font-size: 16px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#fdeef1;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation" style="background-color:#fdeef1;">
    <tr>
      <td align="center" style="padding: 24px 12px 32px;">
        <table class="row-content stack" align="center" width="680" role="presentation" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 22px 45px rgba(122,108,255,0.1);">
          <tr>
            <td class="column" width="100%" style="padding:0;">
              <table width="100%" role="presentation">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #c2f3f8 0%, #fbd3dc 100%); padding: 48px 32px 56px; background-position: top center; background-repeat: no-repeat;">
                    <div style="margin-bottom: 24px;">
                      ${logoMarkup}
                    </div>
                    <h1 class="hero-title" style="margin:0;font-size:34px;font-weight:800;font-family:'Montserrat','Trebuchet MS',sans-serif;color:#2c2b2b;letter-spacing:0.05em;text-transform:uppercase;">
                      ${brandName}
                    </h1>
                    <h2 class="hero-subtitle" style="margin:12px 0 0;font-size:18px;font-weight:500;color:#3b3a3c;letter-spacing:0.12em;text-transform:uppercase;">
                      ${brandTagline}
                    </h2>
                    <div style="margin-top:28px;border-top:1px solid rgba(44,43,43,0.15);width:72px;" aria-hidden="true"></div>
                    <p style="margin:24px auto 0;max-width:420px;font-size:16px;line-height:1.7;color:#3c3b3d;">
                      We travel to you with premium lash artistry, curated beauty, and calm energy—wherever you are.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:48px 48px 32px;background-color:#ffffff;">
                    <table width="100%" role="presentation" style="background-color:#ffffff;">
                      <tr>
                        <td style="background-color:#ffffff;border-radius:20px;padding:0;">
                          <div style="background-color:#ffffff;border:1px solid rgba(122,108,255,0.15);border-radius:20px;padding:32px 36px;">
                            <div style="font-size:16px;line-height:1.8;color:#2f2e30;font-family:'Open Sans','Helvetica Neue',Arial,sans-serif;">
                              ${safeContent}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 48px 8px;">
                    <table width="100%" role="presentation">
                      <tr>
                        <td style="border-top:1px solid rgba(122,108,255,0.15);"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 48px 36px;background-color:#ffffff;">
                    <p style="font-size:15px;line-height:1.6;color:#4a4950;margin:0 0 12px;">With love and gratitude,</p>
                    <p style="font-size:17px;font-weight:700;color:#2f2e30;margin:0 0 22px;">The ${brandName} Team</p>
                    <a href="${baseUrl}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:linear-gradient(135deg,#7a6cff 0%,#f6b5ff 100%);color:#ffffff;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;font-size:13px;box-shadow:0 12px 22px rgba(122,108,255,0.28);">Visit ${brandName}</a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#fbd3dc;padding:30px 28px 34px;text-align:center;">
                    <p style="margin:0 0 10px;font-size:13px;color:#3b3a3c;">Questions or rescheduling? Reply directly to this email and we’ll take care of you.</p>
                    <p style="margin:0 0 10px;font-size:12px;color:#3f3e40;">
                      ${brandName} • ${businessAddress} • <a href="${baseUrl}" style="color:#3f3e40;text-decoration:underline;">${displayUrl}</a>
                    </p>
                    <p style="margin:0;font-size:11px;color:#5a5960;">
                      You’re receiving this email because you opted in for ${brandName} updates. <a href="${unsubscribeUrl}" style="color:#5a5960;text-decoration:underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
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

