import { readDataFile } from '@/lib/data-utils'
import { normalizeServiceCatalog } from '@/lib/services-utils'
import {
  getZohoTransporter,
  isZohoConfigured,
  BUSINESS_NOTIFICATION_EMAIL,
  FROM_EMAIL,
  EMAIL_FROM_NAME,
} from '@/lib/email/zoho-config'

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

const OWNER_EMAIL = BUSINESS_NOTIFICATION_EMAIL
const DEFAULT_LOCATION = process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'
const BASE_URL = normalizeBaseUrl()

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

// Service price mapping for deposit calculation
const servicePrices: { [key: string]: number } = {
  'Classic Lashes': 6000,
  'Subtle Hybrid Lashes': 6000,
  'Hybrid Lashes': 6500,
  'Volume Lashes': 6500,
  'Mega Volume Lashes': 7500,
  'Wispy Lashes': 7000,
  'Classic Infill': 4000,
  'Subtle Hybrid Infill': 4000,
  'Hybrid Infill': 4000,
  'Volume Infill': 4500,
  'Mega Volume Infill': 5000,
  'Wispy Infill': 4500,
  'Lash Lift': 4500,
}

// Cache for service durations to avoid reading file on every call
let serviceDurationCache: { [key: string]: number } | null = null
let serviceDurationCacheTime: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache

// Load service durations from services.json
async function loadServiceDurations(): Promise<{ [key: string]: number }> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (serviceDurationCache && (now - serviceDurationCacheTime) < CACHE_TTL) {
    return serviceDurationCache
  }
  
  try {
    const raw = await readDataFile('services.json', {})
    const { catalog } = normalizeServiceCatalog(raw)
    
    const durations: { [key: string]: number } = {}
    
    // Extract all services from all categories
    catalog.categories.forEach((category) => {
      category.services.forEach((service) => {
        if (service.name && service.duration) {
          // Store with exact name
          durations[service.name] = service.duration
          
          // Also store common variations for flexible matching
          const nameLower = service.name.toLowerCase()
          if (nameLower.includes('classic') && !nameLower.includes('infill')) {
            durations['Classic'] = service.duration
            durations['Classic Lashes'] = service.duration
          }
          if (nameLower.includes('hybrid') && !nameLower.includes('infill')) {
            if (nameLower.includes('subtle')) {
              durations['Subtle Hybrid'] = service.duration
              durations['Subtle Hybrid Lashes'] = service.duration
            } else {
              durations['Hybrid'] = service.duration
              durations['Hybrid Lashes'] = service.duration
            }
          }
          if (nameLower.includes('volume') && !nameLower.includes('infill')) {
            if (nameLower.includes('mega')) {
              durations['Mega Volume'] = service.duration
              durations['Mega Volume Lashes'] = service.duration
            } else {
              durations['Volume'] = service.duration
              durations['Volume Lashes'] = service.duration
            }
          }
          if (nameLower.includes('wispy') && !nameLower.includes('infill')) {
            durations['Wispy'] = service.duration
            durations['Wispy Lashes'] = service.duration
          }
        }
      })
    })
    
    // Update cache
    serviceDurationCache = durations
    serviceDurationCacheTime = now
    
    return durations
  } catch (error) {
    console.error('Error loading service durations:', error)
    // Return empty object on error, will fall back to default
    return {}
  }
}

// Helper function to get service duration with flexible matching
async function getServiceDuration(service: string): Promise<number> {
  if (!service || typeof service !== 'string') {
    return 90 // Default
  }
  
  const durations = await loadServiceDurations()
  const normalized = service.trim()
  
  // Try exact match first
  if (durations[normalized]) {
    return durations[normalized]
  }
  
  // Try case-insensitive match
  const lowerNormalized = normalized.toLowerCase()
  for (const [key, duration] of Object.entries(durations)) {
    if (key.toLowerCase() === lowerNormalized) {
      return duration
    }
  }
  
  // Try partial match (e.g., "Classic" matches "Classic Lashes")
  for (const [key, duration] of Object.entries(durations)) {
    const keyLower = key.toLowerCase()
    if (keyLower.includes(lowerNormalized) || lowerNormalized.includes(keyLower)) {
      return duration
    }
  }
  
  // Default fallback
  return 90
}

type SendEmailPayload = {
  name: string
  email: string
  phone: string
  service: string
  date: string
  timeSlot: string
  location: string
  isFirstTimeClient?: boolean
  originalPrice?: number
  discount?: number
  finalPrice?: number
  deposit?: number
  bookingId?: string
  manageToken?: string
  policyWindowHours?: number
  notes?: string
  appointmentPreference?: string
  desiredLook: string
  desiredLookStatus: 'recommended' | 'custom'
  isReminder?: boolean
  isWalkIn?: boolean
  walkInFee?: number
  isGiftCardBooking?: boolean
  isNewUser?: boolean
}

// Calculate deposit amount (35% of service price)
function calculateDeposit(service: string): { amount: number; formatted: string; servicePrice: number } {
  if (!service || !servicePrices[service]) {
    return { amount: 0, formatted: 'N/A', servicePrice: 0 }
  }
  const servicePrice = servicePrices[service]
  const deposit = Math.round(servicePrice * 0.35)
  return {
    amount: deposit,
    formatted: `KSH ${deposit.toLocaleString()}`,
    servicePrice,
  }
}

function formatGoogleCalendarDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function buildGoogleCalendarLink(options: {
  summary: string
  start: Date
  end: Date
  location: string
  description: string
  reminderMinutes?: number
}) {
  const start = formatGoogleCalendarDate(options.start)
  const end = formatGoogleCalendarDate(options.end)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: options.summary,
    dates: `${start}/${end}`,
    location: options.location,
    details: options.description,
  })
  if (typeof options.reminderMinutes === 'number') {
    params.set('trp', 'true')
    params.set('reminder', `reminderMethod=popup;reminderMinutes=${options.reminderMinutes}`)
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Convert minutes to readable duration format
function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) {
    return 'Not specified'
  }
  
  // Calculate range (base duration to base + 30 minutes)
  const baseHours = Math.floor(minutes / 60)
  const baseMins = minutes % 60
  const upperMinutes = minutes + 30
  const upperHours = Math.floor(upperMinutes / 60)
  const upperMins = upperMinutes % 60
  
  let baseText = ''
  if (baseHours > 0) {
    baseText = `${baseHours} ${baseHours === 1 ? 'hour' : 'hours'}`
    if (baseMins > 0) {
      baseText += ` ${baseMins} ${baseMins === 1 ? 'minute' : 'minutes'}`
    }
  } else {
    baseText = `${baseMins} ${baseMins === 1 ? 'minute' : 'minutes'}`
  }
  
  let upperText = ''
  if (upperHours > 0) {
    upperText = `${upperHours} ${upperHours === 1 ? 'hour' : 'hours'}`
    if (upperMins > 0) {
      upperText += ` ${upperMins} ${upperMins === 1 ? 'minute' : 'minutes'}`
    }
  } else {
    upperText = `${upperMins} ${upperMins === 1 ? 'minute' : 'minutes'}`
  }
  
  return `${baseText} to ${upperText}, averagely`
}

// Create HTML email template for customer
function createCustomerEmailTemplate(bookingData: {
  name: string
  email?: string
  service: string
  formattedDate: string
  formattedTime: string
  formattedEndTime: string
  location: string
  deposit: string
  servicePrice: string
  manageLink?: string
  addToCalendarLink?: string
  policyWindowHours?: number
  desiredLookLabel: string
  lashMapStatusMessage: string
  walkInFee?: string
  isGiftCardBooking?: boolean
  appointmentPreference?: string
  isNewUser?: boolean
  durationText?: string
}) {
  const {
    name,
    email,
    service,
    formattedDate,
    formattedTime,
    formattedEndTime,
    location,
    deposit,
    servicePrice,
    manageLink,
    addToCalendarLink,
    policyWindowHours,
    desiredLookLabel,
    lashMapStatusMessage,
    walkInFee,
    isGiftCardBooking,
    durationText,
  } = bookingData
  const appointmentLocation = location || DEFAULT_LOCATION
  const friendlyName = typeof name === 'string' && name.trim().length > 0 ? name.trim().split(' ')[0] : 'there'
  const windowHours = typeof policyWindowHours === 'number' ? Math.max(policyWindowHours, 1) : 72
  const manageButtonHref = manageLink || `${BASE_URL}/booking`
  const manageButtonLabel = manageLink ? 'Manage appointment' : 'View booking details'
  const showAddToCalendar = Boolean(addToCalendarLink)

  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your LashDiary appointment</title>
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
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">Appointment confirmed</p>
              <h1 style="margin:12px 0 0 0; font-size:36px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600; line-height:1.3; letter-spacing:0.5px;">We're Excited to See You, ${friendlyName}!</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                We've reserved your spot and will have everything ready for you. Here's a quick summary you can keep handy.
              </p>

              <div style="border:1px solid ${accent}; border-radius:14px; padding:20px 24px; background:${background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${brand};">Appointment details</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.6;">
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; width:120px;">Date</td>
                    <td style="padding:6px 0; color:${textPrimary};">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Time</td>
                    <td style="padding:6px 0; color:${textPrimary};">${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Service</td>
                    <td style="padding:6px 0; color:${textPrimary};">${service || 'Lash service'}</td>
                  </tr>
                  ${durationText ? `
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Duration</td>
                    <td style="padding:6px 0; color:${textPrimary};">${durationText}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Service Fee</td>
                    <td style="padding:6px 0; color:${textPrimary};">${servicePrice}</td>
                  </tr>
                  ${walkInFee && walkInFee.trim().length > 0 ? `
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Walk-In Fee</td>
                    <td style="padding:6px 0; color:${textPrimary};">+${walkInFee}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Deposit</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:600;">
                      ${walkInFee && walkInFee.trim().length > 0 ? 'KSH 0 (Pay full amount after appointment)' : deposit}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; vertical-align:top;">Studio</td>
                    <td style="padding:6px 0; color:${textPrimary};">${appointmentLocation}</td>
                  </tr>
                </table>
              </div>

              ${isGiftCardBooking ? `
              <div style="border-radius:14px; padding:18px 20px; background:${card}; border:2px solid ${brand}; margin-bottom:24px;">
                <h2 style="margin:0 0 12px 0; font-size:17px; color:${brand}; font-weight:600;">Gift Card Booking</h2>
                <p style="margin:0; color:${textPrimary}; font-size:14px; line-height:1.7;">
                  As this is a gift card booking, your service type and desired lash look will be discussed during your appointment. We'll work together to create the perfect look for you!
                </p>
              </div>
              ` : ''}

              ${walkInFee && walkInFee.trim().length > 0 ? `
              <div style="border-radius:14px; padding:18px 20px; background:${card}; border:2px solid #FCD34D; margin-bottom:24px;">
                <h2 style="margin:0 0 12px 0; font-size:17px; color:${brand}; font-weight:600;">Walk-In Booking Payment</h2>
                <p style="margin:0 0 12px 0; color:${textPrimary}; font-size:14px; line-height:1.7; font-weight:600;">
                  As a walk-in booking, you will pay the full amount of <strong>${servicePrice}${walkInFee ? ' + ' + walkInFee : ''}</strong> after your appointment is completed.
                </p>
                <p style="margin:0; color:${textSecondary}; font-size:13px; line-height:1.6;">
                  Payment can be made via cash, M-Pesa, or card at the studio after your service.
                </p>
              </div>
              ` : ''}
              <div style="border-radius:14px; padding:18px 20px; background:${card}; border:1px solid ${accent}; margin-bottom:24px;">
                <h2 style="margin:0 0 12px 0; font-size:17px; color:${brand};">Before you arrive</h2>
                <ul style="margin:0; padding-left:18px; color:${textPrimary}; font-size:14px; line-height:1.7;">
                  <li>Please arrive on time — late arrivals may shorten your session.</li>
                  <li>Your deposit is strictly for securing your appointment and cannot be refunded under any circumstance.</li>
                  <li>Come with clean lashes/brows and no makeup, oils, or mascara.</li>
                  <li>Avoid tweezing, waxing, or applying serums/retinol near the area for at least 48 hours before your appointment.</li>
                  <li>If you have eye infections, cold sores, or skin irritation, please reschedule your visit.</li>
                  ${walkInFee && walkInFee.trim().length > 0 ? '' : '<li>Your deposit secures your slot and goes toward your total balance.</li>'}
                </ul>
              </div>

              <p style="margin:0 0 18px 0; font-size:14px; color:${textSecondary};">
                Need to update anything? Reply to this email or email us at <a href="mailto:${OWNER_EMAIL}" style="color:${brand}; text-decoration:none; font-weight:600;">${OWNER_EMAIL}</a>.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0 0 0;">
                <tr>
                  <td align="center" style="padding:0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="padding:0 0 20px 0;">
                          <a href="${manageButtonHref}" style="display:inline-block; padding:12px 28px; background:${brand}; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:15px;">${manageButtonLabel}</a>
                        </td>
                      </tr>
                      ${
                        showAddToCalendar && addToCalendarLink
                          ? `<tr>
                              <td align="center" style="padding:0;">
                                <a href="${addToCalendarLink}" style="display:inline-block; padding:12px 28px; border:2px solid ${brand}; color:${brand}; border-radius:999px; text-decoration:none; font-weight:600; font-size:15px;" target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
                              </td>
                            </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              ${
                showAddToCalendar && addToCalendarLink
                  ? `<p style="margin:18px 0 0 0; font-size:13px; color:${textSecondary}; text-align:center;">Need a device reminder? Use the Google Calendar button to add the appointment with a 24-hour alert.</p>`
                  : ''
              }
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center;">
              <p style="margin:0; font-size:13px; color:${textSecondary};">We're so excited to see you soon!</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">🤎 The LashDiary Team</p>
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

// Create HTML email template for appointment reminder
function createReminderEmailTemplate(bookingData: {
  name: string
  service: string
  formattedDate: string
  formattedTime: string
  formattedEndTime: string
  location: string
  deposit: string
  servicePrice: string
  manageLink?: string
  addToCalendarLink?: string
  policyWindowHours?: number
  desiredLookLabel: string
  lashMapStatusMessage: string
  durationText?: string
}) {
  const {
    name,
    service,
    formattedDate,
    formattedTime,
    formattedEndTime,
    location,
    deposit,
    servicePrice,
    manageLink,
    addToCalendarLink,
    policyWindowHours,
    desiredLookLabel,
    lashMapStatusMessage,
    durationText,
  } = bookingData
  const appointmentLocation = location || DEFAULT_LOCATION
  const friendlyName = typeof name === 'string' && name.trim().length > 0 ? name.trim().split(' ')[0] : 'there'
  const windowHours = typeof policyWindowHours === 'number' ? Math.max(policyWindowHours, 1) : 72
  const manageButtonHref = manageLink || `${BASE_URL}/booking`
  const manageButtonLabel = manageLink ? 'Manage appointment' : 'View booking details'
  const showAddToCalendar = Boolean(addToCalendarLink)

  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reminder: Your LashDiary appointment</title>
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
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">Appointment reminder</p>
              <h1 style="margin:12px 0 0 0; font-size:36px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600; line-height:1.3; letter-spacing:0.5px;">Hi ${friendlyName}!</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                This is a friendly reminder about your upcoming appointment with us. We're looking forward to seeing you!
              </p>

              <div style="border:1px solid ${accent}; border-radius:14px; padding:20px 24px; background:${background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${brand};">Your appointment details</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.6;">
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; width:120px;">Date</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:600;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Time</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:600;">${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Service</td>
                    <td style="padding:6px 0; color:${textPrimary};">${service || 'Lash service'}</td>
                  </tr>
                  ${durationText ? `
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Duration</td>
                    <td style="padding:6px 0; color:${textPrimary};">${durationText}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Fee</td>
                    <td style="padding:6px 0; color:${textPrimary};">${servicePrice}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Deposit</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:600;">${deposit}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; vertical-align:top;">Studio</td>
                    <td style="padding:6px 0; color:${textPrimary};">${appointmentLocation}</td>
                  </tr>
                </table>
              </div>

              <div style="border-radius:14px; padding:18px 20px; background:${card}; border:1px solid ${accent}; margin-bottom:24px;">
                <h2 style="margin:0 0 12px 0; font-size:17px; color:${brand};">Before you arrive</h2>
                <ul style="margin:0; padding-left:18px; color:${textPrimary}; font-size:14px; line-height:1.8;">
                  <li style="margin-bottom:8px;">Arrive with clean, makeup-free lashes</li>
                  <li style="margin-bottom:8px;">Avoid caffeine 2 hours before your appointment</li>
                  <li style="margin-bottom:8px;">Bring a photo of your desired look if you have one</li>
                  <li style="margin-bottom:8px;">Plan for ${service.includes('Volume') || service.includes('Hybrid') ? '2–3' : '1.5–2'} hours</li>
                </ul>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0 0 0;">
                <tr>
                  <td align="center" style="padding:0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      ${manageLink ? `
                      <tr>
                        <td align="center" style="padding:0 0 20px 0;">
                          <a href="${manageButtonHref}" style="display:inline-block; padding:14px 32px; background:${brand}; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:15px; letter-spacing:0.04em; text-transform:uppercase;">${manageButtonLabel}</a>
                        </td>
                      </tr>
                      ` : ''}
                      ${showAddToCalendar && addToCalendarLink ? `
                      <tr>
                        <td align="center" style="padding:0;">
                          <a href="${addToCalendarLink}" style="display:inline-block; padding:12px 28px; background:${card}; color:${brand}; border:2px solid ${brand}; border-radius:999px; text-decoration:none; font-weight:600; font-size:14px;" target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <div style="border-top:1px solid ${accent}; padding-top:20px; margin-top:24px; text-align:center;">
                <p style="margin:0 0 8px 0; font-size:13px; color:${textSecondary};">
                  Need to reschedule or cancel? You can manage your appointment up to ${windowHours} hours before your scheduled time.
                </p>
                <p style="margin:0; font-size:14px; color:${textPrimary};">
                  Questions? Reply to this email or call us anytime.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px; background:${background}; text-align:center; border-top:1px solid ${accent};">
              <p style="margin:0; font-size:13px; color:${textSecondary};">We can't wait to see you!</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">🤎 The LashDiary Team</p>
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

// Create HTML email template for business owner
function createOwnerEmailTemplate(bookingData: {
  name: string
  email: string
  phone: string
  service: string
  formattedDate: string
  formattedTime: string
  formattedEndTime: string
  location: string
  deposit: string
  servicePrice: string
  originalPrice?: string
  discount?: string
  isFirstTimeClient?: boolean
  manageLink?: string
  policyWindowHours?: number
  notes?: string
  appointmentPreference?: string
  addToCalendarLink?: string
  desiredLookLabel: string
  lashMapStatusMessage: string
  adminBookingLink?: string
  isWalkIn?: boolean
  walkInFee?: string
}, customerEmailError?: string | null, customerEmail?: string) {
  const {
    name,
    email,
    phone,
    service,
    formattedDate,
    formattedTime,
    formattedEndTime,
    location,
    deposit,
    servicePrice,
    originalPrice,
    discount,
    isFirstTimeClient,
    manageLink,
    policyWindowHours,
    notes,
    appointmentPreference,
    addToCalendarLink,
    desiredLookLabel,
    lashMapStatusMessage,
    adminBookingLink,
    isWalkIn,
    walkInFee,
  } = bookingData
  const appointmentLocation = location || DEFAULT_LOCATION
  const windowHours = typeof policyWindowHours === 'number' ? Math.max(policyWindowHours, 1) : 72
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  const hasNotes = typeof notes === 'string' && notes.trim().length > 0
  const hasAppointmentPreference = typeof appointmentPreference === 'string' && appointmentPreference.trim().length > 0

  const emailIssueBlock = customerEmailError && customerEmail
    ? `
      <div style="margin-top:24px; border:1px solid #FFDAC8; border-radius:14px; padding:18px 20px; background:#FFF4EF;">
        <h3 style="margin:0 0 8px 0; font-size:16px; color:#C2410C;">Customer email needs attention</h3>
        <p style="margin:0 0 12px 0; font-size:14px; color:${textSecondary}; line-height:1.6;">
          We couldn’t send the confirmation email automatically. Please reach out manually at
          <strong style="color:${brand};"> ${customerEmail}</strong>.
        </p>
        <div style="border-radius:10px; padding:14px 16px; background:#FFFFFF; border:1px dashed #F8B79B; font-size:13px; color:${textSecondary};">
          <p style="margin:0 0 10px 0; font-weight:600; color:${brand};">Suggested message</p>
          <p style="margin:0; white-space:pre-line;">
Dear ${name},
Thank you for booking with LashDiary!
Your appointment is on ${formattedDate} at ${formattedTime}.
Service: ${service || 'Lash service'}
Fee: ${servicePrice}
Deposit: ${deposit}
Location: ${appointmentLocation}

We’re excited to see you.
The LashDiary Team
          </p>
        </div>
        <p style="margin:14px 0 0 0; font-size:13px; color:${textSecondary};">Error details: ${customerEmailError}</p>
      </div>
    `
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New booking received</title>
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
            <td style="padding:28px 32px 16px 32px; background:${card};">
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">New booking</p>
              <h1 style="margin:12px 0 0 0; font-size:32px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600; line-height:1.3; letter-spacing:0.5px;">${name} just booked an appointment</h1>
              ${isFirstTimeClient ? `<p style="margin:12px 0 0 0; font-size:13px; color:${textSecondary}; background:${background}; padding:10px 14px; border-radius:10px; display:inline-block;">First-time client</p>` : ''}
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 32px 32px;">
              <div style="border:1px solid ${accent}; border-radius:14px; padding:20px 24px; background:${background}; margin-bottom:22px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${brand};">Client</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.6;">
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; width:130px;">Name</td>
                    <td style="padding:6px 0; color:${textPrimary};">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Email</td>
                    <td style="padding:6px 0; color:${textPrimary};"><a href="mailto:${email}" style="color:${brand}; text-decoration:none;">${email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Phone</td>
                    <td style="padding:6px 0; color:${textPrimary};"><a href="tel:${phone}" style="color:${brand}; text-decoration:none;">${phone}</a></td>
                  </tr>
                </table>
              </div>

              <div style="border:1px solid ${accent}; border-radius:14px; padding:20px 24px; background:${card}; margin-bottom:22px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${brand};">Appointment</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.6;">
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; width:130px;">Service</td>
                    <td style="padding:6px 0; color:${textPrimary};">${service || 'Not specified'}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Lash map status</td>
                    <td style="padding:6px 0; color:${textPrimary};">${lashMapStatusMessage}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Date</td>
                    <td style="padding:6px 0; color:${textPrimary};">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Time</td>
                    <td style="padding:6px 0; color:${textPrimary};">${formattedTime} – ${formattedEndTime}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; vertical-align:top;">Location</td>
                    <td style="padding:6px 0; color:${textPrimary};">${appointmentLocation}</td>
                  </tr>
                </table>
                ${hasNotes ? `
                <div style="margin-top:16px; padding:14px 16px; border-radius:12px; background:${background}; border:1px dashed ${accent};">
                  <p style="margin:0 0 6px 0; font-size:14px; color:${textSecondary}; text-transform:uppercase; letter-spacing:1px;">Client notes</p>
                  <p style="margin:0; font-size:15px; line-height:1.6; color:${textPrimary}; white-space:pre-line;">${notes?.trim()}</p>
                </div>
                ` : ''}
                ${appointmentPreference ? `
                <div style="margin-top:16px; padding:14px 16px; border-radius:12px; background:${background}; border:1px dashed ${accent};">
                  <p style="margin:0 0 6px 0; font-size:14px; color:${textSecondary}; text-transform:uppercase; letter-spacing:1px;">Appointment Preference</p>
                  <p style="margin:0; font-size:15px; line-height:1.6; color:${textPrimary};">
                    ${appointmentPreference === 'quiet' ? 'Quiet Appointment - I prefer minimal conversation' : 
                      appointmentPreference === 'chat' ? 'Small Chat Session - I enjoy friendly conversation' : 
                      appointmentPreference === 'either' ? 'Either is fine - I\'m flexible' : 
                      appointmentPreference}
                  </p>
                </div>
                ` : ''}
              </div>

              <div style="border:1px solid ${accent}; border-radius:14px; padding:18px 22px; background:${background}; margin-bottom:10px;">
                <h2 style="margin:0 0 12px 0; font-size:17px; color:${brand};">Payment summary</h2>
                ${isWalkIn ? `
                <div style="margin-bottom:12px; padding:12px 14px; background:#FEF3C7; border:1px solid #FCD34D; border-radius:10px;">
                  <p style="margin:0; font-size:13px; color:#92400E; font-weight:600;">Walk-In Booking</p>
                  <p style="margin:4px 0 0 0; font-size:12px; color:#78350F; line-height:1.5;">
                    This is a walk-in booking. The client will pay the full amount of <strong>${servicePrice}</strong> after the appointment is completed. No deposit required.
                  </p>
                </div>
                ` : ''}
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px; line-height:1.6;">
                  ${originalPrice ? `<tr><td style="padding:4px 0; color:${textSecondary}; width:140px;">Original price</td><td style="padding:4px 0; color:${textPrimary};">${originalPrice}</td></tr>` : ''}
                  ${discount ? `<tr><td style="padding:4px 0; color:${textSecondary};">Discount</td><td style="padding:4px 0; color:${textPrimary};">${discount}</td></tr>` : ''}
                  ${isWalkIn && walkInFee ? `<tr><td style="padding:4px 0; color:${textSecondary};">Walk-In Fee</td><td style="padding:4px 0; color:${textPrimary};">+${walkInFee}</td></tr>` : ''}
                  <tr>
                    <td style="padding:4px 0; color:${textSecondary};">Final price</td>
                    <td style="padding:4px 0; color:${textPrimary}; font-weight:600;">${servicePrice}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; color:${textSecondary};">Deposit due</td>
                    <td style="padding:4px 0; color:${brand}; font-weight:600;">${isWalkIn ? 'KSH 0 (Pay full amount after appointment)' : deposit}</td>
                  </tr>
                </table>
              </div>

              ${emailIssueBlock}

              ${
                adminBookingLink
                  ? `
              <div style="margin:24px 0 0 0; text-align:center;">
                <a href="${adminBookingLink}" style="display:inline-block; padding:10px 24px; background:${brand}; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:14px;" target="_blank" rel="noopener noreferrer">View booking in dashboard</a>
              </div>
              `
                  : ''
              }

              ${
                addToCalendarLink
                  ? `
              <div style="margin:18px 0 0 0; text-align:center; display:flex; flex-direction:column; align-items:center; gap:10px;">
                <a href="${addToCalendarLink}" style="display:inline-block; padding:10px 22px; background:${brand}; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:14px;" target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
              </div>
              <p style="margin:12px 0 0 0; font-size:12px; color:${textSecondary}; text-align:center;">Need a device reminder? Use the Google Calendar button to add the appointment with a 24-hour alert.</p>
              `
                  : ''
              }

              ${
                addToCalendarLink
                  ? ''
                  : `<p style="margin:28px 0 0 0; font-size:14px; color:${textSecondary};"></p>`
              }
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center;">
              <p style="margin:0; font-size:13px; color:${textSecondary};">LashDiary booking assistant</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">🤎 You've got this</p>
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

// Create HTML email template for aftercare instructions
function createAftercareEmailTemplate(bookingData: {
  name: string
  email?: string
  service: string
  formattedDate: string
  formattedTime: string
  location: string
}) {
  const {
    name,
    service,
    formattedDate,
    formattedTime,
    location,
  } = bookingData
  const appointmentLocation = location || DEFAULT_LOCATION
  const friendlyName = typeof name === 'string' && name.trim().length > 0 ? name.trim().split(' ')[0] : 'there'

  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lash Aftercare Instructions</title>
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
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">Your lash care journey</p>
              <h1 style="margin:12px 0 0 0; font-size:36px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600; line-height:1.3; letter-spacing:0.5px;">Keep Your Lashes Beautiful, ${friendlyName}!</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                We hope you love your new lashes! To keep them looking beautiful and maintain their longevity, please follow these essential aftercare tips.
              </p>

              <div style="border-radius:14px; padding:18px 20px; background:${card}; border:1px solid ${accent}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${brand};">Your Appointment Details</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.6;">
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; width:120px;">Service</td>
                    <td style="padding:6px 0; color:${textPrimary};">${service || 'Lash service'}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Date</td>
                    <td style="padding:6px 0; color:${textPrimary};">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Time</td>
                    <td style="padding:6px 0; color:${textPrimary};">${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; vertical-align:top;">Location</td>
                    <td style="padding:6px 0; color:${textPrimary};">${appointmentLocation}</td>
                  </tr>
                </table>
              </div>

              <div style="border-radius:14px; padding:20px 24px; background:${background}; border:2px solid ${brand}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:20px; color:${brand}; font-weight:600;">10 Essential Aftercare Tips</h2>
                <ol style="margin:0; padding-left:20px; color:${textPrimary}; font-size:14px; line-height:1.8;">
                  <li style="margin-bottom:12px;">
                    <strong style="color:${brand};">Avoid water for 24-48 hours:</strong> Keep your lashes completely dry for the first 24-48 hours after application. This allows the adhesive to fully cure. Avoid saunas, steam rooms, and hot steamy showers during this time.
                  </li>
                  <li style="margin-bottom:12px;">
                    <strong style="color:${brand};">Do not rub or pull:</strong> Never rub your eyes or pull on your extensions. This can damage both your extensions and your natural lashes, leading to poor retention.
                  </li>
                  <li style="margin-bottom:12px;">
                    <strong style="color:${brand};">Avoid direct heat:</strong> Stay away from direct heat sources like hot ovens, open flames, or lighters. The PBT fibre in eyelash extensions is extremely sensitive to heat.
                  </li>
                  <li style="margin-bottom:12px;">
                    <strong style="color:${brand};">No oil-based products:</strong> Avoid any oil-based products near your eyes, including mascara, face moisturisers, cleansers, and makeup. Oil breaks down the adhesive bond. Use only water-based products.
                  </li>
                  <li style="margin-bottom:12px;">
                    <strong style="color:${brand};">No mascara:</strong> Avoid mascara completely, even water-based ones. Mascara can affect the shape of your extensions, add excess weight, and potentially damage both your extensions and natural lashes.
                  </li>
                  <li style="margin-bottom:12px;">
                    <strong style="color:${brand};">Brush daily:</strong> Gently brush your lashes daily with a clean spoolie brush to keep them neat, separated, and looking natural. This prevents clumping and maintains their beautiful appearance.
                  </li>
                  <li style="margin-bottom:12px;">
                    <strong style="color:${brand};">Sleep on your back:</strong> Try to sleep on your back to preserve the curl and position of your lashes. Sleeping on your side is okay, but avoid sleeping face down.
                  </li>
                  <li style="margin-bottom:12px;">
                    <strong style="color:${brand};">Clean regularly:</strong> Clean your lashes at least twice daily—once in the morning and once before bed. Use a gentle, oil-free cleanser to maintain hygiene and prevent infections or lash mites.
                  </li>
                  <li style="margin-bottom:12px;">
                    <strong style="color:${brand};">No eyelash curlers:</strong> Never use an eyelash curler on your extensions. They're already beautifully curled, and curling can damage or lift the extensions.
                  </li>
                  <li style="margin-bottom:12px;">
                    <strong style="color:${brand};">Schedule regular infills:</strong> Book your infill appointments every 2-3 weeks to maintain fullness and keep your lashes looking gorgeous. Waiting longer may require a full set instead.
                  </li>
                </ol>
              </div>

              <div style="border-radius:14px; padding:18px 20px; background:${card}; border:1px solid ${accent}; margin-bottom:24px;">
                <h2 style="margin:0 0 12px 0; font-size:17px; color:${brand};">Remember</h2>
                <p style="margin:0; color:${textPrimary}; font-size:14px; line-height:1.7;">
                  Following these aftercare tips will help your lash extensions last longer and keep your natural lashes healthy. With proper care, your extensions should last 2-4 weeks before needing a fill.
                </p>
              </div>

              <p style="margin:0 0 18px 0; font-size:14px; color:${textSecondary};">
                Have questions about your aftercare? Reply to this email or contact us at <a href="mailto:${OWNER_EMAIL}" style="color:${brand}; text-decoration:none; font-weight:600;">${OWNER_EMAIL}</a>. We're here to help!
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center;">
              <p style="margin:0; font-size:13px; color:${textSecondary};">We can't wait to see you again for your next appointment!</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">🤎 The LashDiary Team</p>
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

// Send aftercare email to client
export async function sendAftercareEmail(bookingData: {
  name: string
  email: string
  service: string
  date: string
  timeSlot: string
  location?: string
}) {
  const transporter = getZohoTransporter()
  if (!transporter) {
    console.warn('Email transporter not configured. Skipping aftercare email.')
    return { success: false, error: 'Email not configured' }
  }

  try {
    const { name, email, service, date, timeSlot, location } = bookingData
    
    // Format date and time
    const dateObj = new Date(timeSlot || date)
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const formattedTime = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    const htmlContent = createAftercareEmailTemplate({
      name,
      email,
      service,
      formattedDate,
      formattedTime,
      location: location || DEFAULT_LOCATION,
    })

    const mailOptions = {
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Essential Aftercare Tips for Your Beautiful Lashes',
      html: htmlContent,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Aftercare email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('Error sending aftercare email:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

// Send email notification using Zoho SMTP
export async function sendEmailNotification(bookingData: SendEmailPayload) {
  const {
    name,
    email,
    phone,
    service,
    date,
    timeSlot,
    location,
    isFirstTimeClient,
    originalPrice,
    discount,
    finalPrice,
    deposit,
    bookingId,
    manageToken,
    policyWindowHours,
    notes,
    appointmentPreference,
    desiredLook,
    desiredLookStatus,
    isWalkIn,
    walkInFee,
    isGiftCardBooking,
  } = bookingData
  const appointmentLocation = location || DEFAULT_LOCATION
  const windowHours = typeof policyWindowHours === 'number' ? Math.max(policyWindowHours, 1) : 72
  const manageLink = manageToken ? `${BASE_URL}/booking/manage/${manageToken}` : undefined
  const adminBookingLink =
    bookingId && typeof bookingId === 'string'
      ? `${BASE_URL}/admin/bookings?bookingId=${encodeURIComponent(bookingId)}`
      : `${BASE_URL}/admin/bookings`
  const ownerNotes = typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : ''
  let customerEmailError: string | null = null
  let customerEmailStatus: 'sent' | 'pending' | 'error' | 'skipped' = 'skipped'
  let customerEmailId: string | null = null

  // Use provided pricing or calculate from service
  let servicePrice =
    typeof originalPrice === 'number' && originalPrice > 0 ? originalPrice : 0
  let discountAmount =
    typeof discount === 'number' && discount > 0 ? discount : 0
  let finalServicePrice =
    typeof finalPrice === 'number' && finalPrice > 0 ? finalPrice : 0
  let depositAmount =
    typeof deposit === 'number' && deposit > 0 ? deposit : 0

  // If pricing not provided, calculate from service
  const depositInfo = calculateDeposit(service)
  if (servicePrice <= 0) {
    servicePrice = depositInfo.servicePrice
  }

  if (servicePrice > 0 && isFirstTimeClient && discountAmount <= 0) {
    discountAmount = Math.round(servicePrice * 0.1)
  }

  if (finalServicePrice <= 0) {
    finalServicePrice = Math.max(servicePrice - discountAmount, 0)
  }
  if (finalServicePrice <= 0 && servicePrice > 0) {
    finalServicePrice = servicePrice
  }

  // Walk-ins pay after appointment, no deposit required
  if (isWalkIn) {
    depositAmount = 0
  } else if (depositAmount <= 0) {
    depositAmount =
      finalServicePrice > 0
        ? Math.round(finalServicePrice * 0.35)
        : depositInfo.amount
  }

  const remainingAmount = Math.max(finalServicePrice - depositAmount, 0)
  const remainingFormatted =
    remainingAmount > 0 ? `KSH ${remainingAmount.toLocaleString()}` : 'KSH 0'
  
  // Handle walk-in fee
  const walkInFeeAmount = (isWalkIn && typeof walkInFee === 'number' && walkInFee > 0) ? walkInFee : 0
  const walkInFeeFormatted = walkInFeeAmount > 0 ? `KSH ${walkInFeeAmount.toLocaleString()}` : ''
  
  // Format the date and time
  const appointmentDate = new Date(date)
  const appointmentTime = new Date(timeSlot)
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = appointmentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  // Calculate end time based on service duration
  const serviceDuration = await getServiceDuration(service) // Use flexible lookup from services.json
  const endTime = new Date(appointmentTime)
  endTime.setMinutes(endTime.getMinutes() + serviceDuration)
  const formattedEndTime = endTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  // Format duration text for email
  const durationText = formatDuration(serviceDuration)
  
  // Format prices
  const servicePriceFormatted = servicePrice > 0 
    ? `KSH ${servicePrice.toLocaleString()}` 
    : 'Not specified'
  const discountFormatted = discountAmount > 0
    ? `KSH ${discountAmount.toLocaleString()}`
    : 'KSH 0'
  const finalPriceFormatted = finalServicePrice > 0
    ? `KSH ${finalServicePrice.toLocaleString()}`
    : servicePriceFormatted
  const depositFormatted = depositAmount > 0
    ? `KSH ${depositAmount.toLocaleString()}`
    : 'N/A'


  const eventSummary = `LashDiary Appointment – ${service || 'Lash Service'}`
  const desiredLookLabel = typeof desiredLook === 'string' && desiredLook.trim().length > 0
    ? desiredLook
    .split('-')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Custom'
  const lashMapStatusMessage =
    desiredLookStatus === 'recommended'
      ? 'Lash map ready, can plan before arrival.'
      : 'Map will be decided at appointment.'
  
  const appointmentStart = new Date(appointmentTime)
  const appointmentEnd = new Date(endTime)
  const calendarDescription = `${service || 'Lash Service'} appointment with ${name}.\n\nLocation: ${appointmentLocation}\nPhone: ${phone}${ownerNotes ? `\n\nNotes: ${ownerNotes}` : ''}`
  const addToCalendarLink = buildGoogleCalendarLink({
    summary: eventSummary,
    start: appointmentStart,
    end: appointmentEnd,
    location: appointmentLocation,
    description: calendarDescription,
    reminderMinutes: 1440,
  })

  const ownerEmailTemplateData = {
    name,
    email,
    phone,
    service: service || 'Not specified',
    formattedDate,
    formattedTime,
    formattedEndTime,
    location: appointmentLocation,
    deposit: depositFormatted,
    servicePrice: finalPriceFormatted,
    originalPrice: servicePriceFormatted,
    discount: discountFormatted,
    isFirstTimeClient: isFirstTimeClient === true,
    manageLink,
    policyWindowHours: windowHours,
    notes: ownerNotes,
    appointmentPreference: appointmentPreference || undefined,
    addToCalendarLink,
    desiredLookLabel,
    lashMapStatusMessage,
    adminBookingLink,
    isWalkIn: isWalkIn === true,
    walkInFee: walkInFeeFormatted,
  }

  const baseOwnerEmailHtml = createOwnerEmailTemplate(ownerEmailTemplateData)
  let ownerEmailHtml = baseOwnerEmailHtml

  if (!isZohoConfigured()) {
    console.error('⚠️ Zoho SMTP credentials are not configured. Email notifications will not be sent.')
    console.error('Please add ZOHO_SMTP_USER and ZOHO_SMTP_PASS to your environment.')
    console.log('=== NEW BOOKING REQUEST (Email not sent) ===')
    console.log('To:', OWNER_EMAIL)
    console.log('Subject: New Booking Request -', name)
    console.log('Client:', name, email, phone)
    console.log('Date:', formattedDate, formattedTime)
    console.log('==========================================')
    return {
      success: false,
      status: 'disabled',
      error: 'Email service not configured. Please add Zoho SMTP credentials to the environment.',
    }
  }

  const transporter = getZohoTransporter()
  if (!transporter) {
    console.error('❌ Failed to create Zoho transporter despite configuration being present')
    return {
      success: false,
      status: 'error',
      error: 'Failed to initialize email service. Please check Zoho SMTP configuration.',
    }
  }

  try {
    console.log('📧 Attempting to send emails via Zoho SMTP...')
    const fromAddress = `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`

      // Validate email address
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        console.error('❌ Invalid email address provided:', email)
        customerEmailStatus = 'error'
        customerEmailError = 'Invalid email address'
      } else if (email) {
        try {
          console.log(`📧 Preparing to send customer email to: ${email}`)
          // Format time for reminder subject
          const appointmentTimeForSubject = bookingData.isReminder
            ? new Date(bookingData.timeSlot).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : ''
          
          const emailSubject = bookingData.isReminder
            ? `Reminder: Your appointment is at ${appointmentTimeForSubject}`
            : 'Your Appointment is Confirmed'
          
          console.log(`📧 Email subject: ${emailSubject}`)
          
          const emailHtml = bookingData.isReminder
            ? createReminderEmailTemplate({
                name,
                service: service || 'Lash Service',
                formattedDate,
                formattedTime,
                formattedEndTime,
                location: appointmentLocation,
                deposit: depositFormatted,
                servicePrice: finalPriceFormatted,
                manageLink,
                addToCalendarLink,
                policyWindowHours: windowHours,
                desiredLookLabel,
                lashMapStatusMessage,
                durationText,
              })
            : createCustomerEmailTemplate({
                name,
                email,
                service: service || 'Lash Service',
                formattedDate,
                formattedTime,
                formattedEndTime,
                location: appointmentLocation,
                deposit: depositFormatted,
                servicePrice: finalPriceFormatted,
                manageLink,
                addToCalendarLink,
                policyWindowHours: windowHours,
                desiredLookLabel,
                lashMapStatusMessage,
                walkInFee: walkInFeeFormatted,
                isGiftCardBooking: isGiftCardBooking === true,
                appointmentPreference: appointmentPreference || undefined,
                durationText,
              })

          console.log(`📧 Sending email via Zoho SMTP to: ${email}`)
          console.log(`📧 From address: ${fromAddress}`)
          
          const customerResult = await transporter.sendMail({
            from: fromAddress,
            to: email,
            replyTo: OWNER_EMAIL,
            subject: emailSubject,
            html: emailHtml,
          })

          console.log(`📧 Zoho SMTP response:`, {
            messageId: customerResult.messageId,
            accepted: customerResult.accepted,
            rejected: customerResult.rejected,
            response: customerResult.response,
          })

          customerEmailId = customerResult.messageId || null
          const rejected = Array.isArray(customerResult.rejected) ? customerResult.rejected : []
          if (rejected.length > 0) {
            customerEmailError = `Zoho rejected recipients: ${rejected.join(', ')}`
            customerEmailStatus = 'error'
            console.error('❌ Zoho SMTP rejected customer email:', rejected)
            ownerEmailHtml = createOwnerEmailTemplate(ownerEmailTemplateData, customerEmailError, email)
          } else if (customerEmailId || (Array.isArray(customerResult.accepted) && customerResult.accepted.length > 0)) {
            customerEmailStatus = 'sent'
            console.log('✅ Customer email sent via Zoho SMTP! ID:', customerEmailId)
            console.log('✅ Accepted recipients:', customerResult.accepted)
          } else {
            customerEmailStatus = 'pending'
            customerEmailError = 'Zoho SMTP accepted the message but did not return a delivery ID.'
            console.warn('⚠️ Customer email status pending via Zoho SMTP.')
            console.warn('⚠️ Full response:', JSON.stringify(customerResult, null, 2))
          }
        } catch (customerError: any) {
          customerEmailError = customerError.message || 'Unknown Zoho SMTP error'
          customerEmailStatus = 'error'
          console.error('❌ Exception sending customer email via Zoho SMTP:', customerError)
          ownerEmailHtml = createOwnerEmailTemplate(ownerEmailTemplateData, customerEmailError, email)
        }
      }

      const ownerResult = await transporter.sendMail({
        from: fromAddress,
        to: OWNER_EMAIL,
        replyTo: email || OWNER_EMAIL,
        subject: `New Booking Request`,
        html: ownerEmailHtml,
      })

      console.log('✅ Owner email sent via Zoho SMTP:', ownerResult.messageId)

      const status =
        customerEmailStatus === 'sent'
          ? 'sent'
          : customerEmailStatus === 'pending'
          ? 'pending'
          : customerEmailStatus === 'error'
          ? 'customer_error'
          : 'owner_only'

      return {
        success: true,
        status,
        ownerEmailId: ownerResult.messageId,
        customerEmailId,
        customerEmailError,
        ownerEmailSent: true,
        customerEmailSent: customerEmailStatus === 'sent',
      }
    } catch (zohoError: any) {
      console.error('❌ Zoho SMTP error:', zohoError)
      return {
        success: false,
        status: 'error',
        error: zohoError.message || 'Zoho SMTP error',
        details: zohoError.stack,
      }
    }
}

// Create HTML email template for verification code
function createVerificationCodeEmailTemplate(data: {
  name: string
  code: string
}) {
  const { name, code } = data
  const friendlyName = typeof name === 'string' && name.trim().length > 0 ? name.trim().split(' ')[0] : 'there'
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - LashDiary</title>
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
            <td style="padding:32px; background:${card}; text-align:center;">
              <h1 style="margin:0 0 16px 0; font-size:28px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600;">Verify Your Email Address</h1>
              <p style="margin:0; font-size:16px; color:${textSecondary}; line-height:1.6;">
                Hi ${friendlyName}!
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px 32px;">
              <div style="border-radius:14px; padding:24px; background:${background}; border:2px solid ${brand}; margin-bottom:24px; text-align:center;">
                <p style="margin:0 0 12px 0; font-size:14px; color:${textSecondary}; text-transform:uppercase; letter-spacing:1px;">Your Verification Code</p>
                <div style="font-size:36px; font-weight:700; letter-spacing:8px; color:${brand}; font-family:'Courier New', monospace; padding:16px; background:${card}; border-radius:10px; border:2px dashed ${accent};">
                  ${code}
                </div>
              </div>

              <p style="margin:0 0 16px 0; font-size:15px; color:${textPrimary}; line-height:1.7;">
                To complete your account setup and secure your booking, please enter this verification code in the booking form.
              </p>

              <div style="border-radius:10px; padding:16px; background:${accent}; margin-bottom:20px;">
                <p style="margin:0; font-size:13px; color:${textSecondary};">
                  <strong>Security Note:</strong> This code expires in 30 minutes. If you didn't request this code, please ignore this email.
                </p>
              </div>

              <p style="margin:0; font-size:14px; color:${textSecondary};">
                Questions? Reply to this email or contact us at <a href="mailto:${OWNER_EMAIL}" style="color:${brand}; text-decoration:none; font-weight:600;">${OWNER_EMAIL}</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center; border-top:1px solid ${accent};">
              <p style="margin:0; font-size:13px; color:${textSecondary};">Welcome to LashDiary!</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">🤎 The LashDiary Team</p>
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

// Send verification code email
export async function sendVerificationCodeEmail(data: {
  name: string
  email: string
  code: string
}) {
  const { name, email, code } = data

  const transporter = getZohoTransporter()
  if (!transporter) {
    console.warn('Email transporter not configured. Skipping verification code email.')
    return { success: false, error: 'Email not configured' }
  }

  try {
    const htmlContent = createVerificationCodeEmailTemplate({ name, code })

    const mailOptions = {
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Complete Your Account Setup - Verification Code Inside',
      html: htmlContent,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Verification code email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('Error sending verification code email:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

