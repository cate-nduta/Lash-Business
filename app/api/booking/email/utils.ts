import nodemailer from 'nodemailer'

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

const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'
const OWNER_EMAIL = BUSINESS_NOTIFICATION_EMAIL
const DEFAULT_LOCATION = process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'
const BASE_URL = normalizeBaseUrl()
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'LashDiary'
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

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

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

// Service duration mapping in minutes
const serviceDurations: { [key: string]: number } = {
  'Classic Lashes': 90,
  'Subtle Hybrid Lashes': 120,
  'Hybrid Lashes': 120,
  'Volume Lashes': 150,
  'Mega Volume Lashes': 180,
  'Wispy Lashes': 150,
  'Classic Infill': 60,
  'Subtle Hybrid Infill': 75,
  'Hybrid Infill': 75,
  'Volume Infill': 90,
  'Mega Volume Infill': 120,
  'Wispy Infill': 90,
  'Lash Lift': 60,
}

type EyeShapeSelection = {
  id: string
  label: string
  imageUrl: string
  description?: string | null
  recommendedStyles?: string[]
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
  transferFromName?: string
  notes?: string
  eyeShape: EyeShapeSelection
  desiredLook: string
  desiredLookStatus: 'recommended' | 'custom'
  desiredLookMatchesRecommendation: boolean
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
  transferNote?: string
  transferFinancialNote?: string
  eyeShapeLabel: string
  eyeShapeRecommendations?: string[]
  desiredLookLabel: string
  lashMapStatusMessage: string
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
    transferNote = '',
    transferFinancialNote = '',
    eyeShapeLabel,
    eyeShapeRecommendations = [],
    desiredLookLabel,
    lashMapStatusMessage,
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
</head>
<body style="margin:0; padding:0; background:${background}; font-family: 'Helvetica Neue', Arial, sans-serif; color:${textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${card}; border-radius:18px; border:1px solid ${accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${card};">
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">Appointment confirmed</p>
              <h1 style="margin:12px 0 0 0; font-size:28px; color:${brand};">Thank you, ${friendlyName}!</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                We’ve reserved your spot and will have everything ready for you. Here’s a quick summary you can keep handy.
              </p>
              ${
                transferNote
                  ? `<div style="margin:0 0 18px 0; border-left:4px solid ${brand}; padding:12px 16px; background:${background}; font-size:14px; line-height:1.6; color:${textPrimary};">
                      ${transferNote}
                      ${
                        transferFinancialNote
                          ? `<p style="margin:12px 0 0 0; font-weight:600;">${transferFinancialNote}</p>`
                          : ''
                      }
                    </div>`
                  : transferFinancialNote
                  ? `<div style="margin:0 0 18px 0; border-left:4px solid ${brand}; padding:12px 16px; background:${background}; font-size:14px; line-height:1.6; color:${textPrimary}; font-weight:600;">
                      ${transferFinancialNote}
                    </div>`
                  : ''
              }

              <div style="border:1px solid ${accent}; border-radius:14px; padding:20px 24px; background:${background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${brand};">Appointment details</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.6;">
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; width:120px;">Date</td>
                    <td style="padding:6px 0; color:${textPrimary};">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Time</td>
                    <td style="padding:6px 0; color:${textPrimary};">${formattedTime} – ${formattedEndTime}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Service</td>
                    <td style="padding:6px 0; color:${textPrimary};">${service || 'Lash service'}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Eye shape</td>
                    <td style="padding:6px 0; color:${textPrimary};">${eyeShapeLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Desired lash look</td>
                    <td style="padding:6px 0; color:${textPrimary};">${desiredLookLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Lash map status</td>
                    <td style="padding:6px 0; color:${textPrimary};">${lashMapStatusMessage}</td>
                  </tr>
                  ${
                    eyeShapeRecommendations.length > 0
                      ? `<tr>
                          <td style="padding:6px 0; color:${textSecondary}; vertical-align:top;">Recommended styles</td>
                          <td style="padding:6px 0; color:${textPrimary};">${eyeShapeRecommendations.join(', ')}</td>
                        </tr>`
                      : ''
                  }
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
                <ul style="margin:0; padding-left:18px; color:${textPrimary}; font-size:14px; line-height:1.7;">
                  <li>Please arrive on time — late arrivals may shorten your session.</li>
                  <li>Cancellations made within 72 hours of your appointment are non-refundable.</li>
                  <li>Come with clean lashes/brows and no makeup, oils, or mascara.</li>
                  <li>Avoid tweezing, waxing, or applying serums/retinol near the area for at least 48 hours before your appointment.</li>
                  <li>If you have eye infections, cold sores, or skin irritation, please reschedule your visit.</li>
                  <li>Your deposit secures your slot and goes toward your total balance.</li>
                </ul>
              </div>

              <p style="margin:0 0 18px 0; font-size:14px; color:${textSecondary};">
                Need to update anything? Reply to this email or email us at <a href="mailto:${OWNER_EMAIL}" style="color:${brand}; text-decoration:none; font-weight:600;">${OWNER_EMAIL}</a>.
              </p>

              <div style="margin:28px 0 0 0; text-align:center; display:flex; flex-direction:column; align-items:center; gap:16px;">
                <a href="${manageButtonHref}" style="display:inline-block; padding:12px 28px; background:${brand}; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:15px;">${manageButtonLabel}</a>
                ${
                  showAddToCalendar && addToCalendarLink
                    ? `<a href="${addToCalendarLink}" style="display:inline-block; padding:12px 28px; border:2px solid ${brand}; color:${brand}; border-radius:999px; text-decoration:none; font-weight:600; font-size:15px;" target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>`
                    : ''
                }
              </div>

              ${
                showAddToCalendar && addToCalendarLink
                  ? `<p style="margin:18px 0 0 0; font-size:13px; color:${textSecondary}; text-align:center;">Need a device reminder? Use the Google Calendar button to add the appointment with a 24-hour alert.</p>`
                  : ''
              }
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center;">
              <p style="margin:0; font-size:13px; color:${textSecondary};">We’re so excited to see you soon.</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">The LashDiary Team</p>
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
  addToCalendarLink?: string
  eyeShapeLabel: string
  recommendedStyles: string[]
  desiredLookLabel: string
  lashMapStatusMessage: string
  adminBookingLink?: string
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
    addToCalendarLink,
    eyeShapeLabel,
    recommendedStyles,
    desiredLookLabel,
    lashMapStatusMessage,
    adminBookingLink,
  } = bookingData
  const appointmentLocation = location || DEFAULT_LOCATION
  const windowHours = typeof policyWindowHours === 'number' ? Math.max(policyWindowHours, 1) : 72
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  const hasNotes = typeof notes === 'string' && notes.trim().length > 0

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
</head>
<body style="margin:0; padding:0; background:${background}; font-family: 'Helvetica Neue', Arial, sans-serif; color:${textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${card}; border-radius:18px; border:1px solid ${accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 16px 32px; background:${card};">
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">New booking</p>
              <h1 style="margin:12px 0 0 0; font-size:26px; color:${brand};">${name} just booked an appointment</h1>
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
                    <td style="padding:6px 0; color:${textSecondary};">Eye shape</td>
                    <td style="padding:6px 0; color:${textPrimary};">${eyeShapeLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Desired lash look</td>
                    <td style="padding:6px 0; color:${textPrimary};">${desiredLookLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Lash map status</td>
                    <td style="padding:6px 0; color:${textPrimary};">${lashMapStatusMessage}</td>
                  </tr>
                  ${
                    recommendedStyles.length > 0
                      ? `<tr>
                          <td style="padding:6px 0; color:${textSecondary}; vertical-align:top;">Recommended styles</td>
                          <td style="padding:6px 0; color:${textPrimary};">${recommendedStyles.join(', ')}</td>
                        </tr>`
                      : ''
                  }
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
              </div>

              <div style="border:1px solid ${accent}; border-radius:14px; padding:18px 22px; background:${background}; margin-bottom:10px;">
                <h2 style="margin:0 0 12px 0; font-size:17px; color:${brand};">Payment summary</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px; line-height:1.6;">
                  ${originalPrice ? `<tr><td style="padding:4px 0; color:${textSecondary}; width:140px;">Original price</td><td style="padding:4px 0; color:${textPrimary};">${originalPrice}</td></tr>` : ''}
                  ${discount ? `<tr><td style="padding:4px 0; color:${textSecondary};">Discount</td><td style="padding:4px 0; color:${textPrimary};">${discount}</td></tr>` : ''}
                  <tr>
                    <td style="padding:4px 0; color:${textSecondary};">Final price</td>
                    <td style="padding:4px 0; color:${textPrimary}; font-weight:600;">${servicePrice}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; color:${textSecondary};">Deposit due</td>
                    <td style="padding:4px 0; color:${brand}; font-weight:600;">${deposit}</td>
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
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">You’ve got this ✨</p>
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
    eyeShape,
    desiredLook,
    desiredLookStatus,
    desiredLookMatchesRecommendation,
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

  if (depositAmount <= 0) {
    depositAmount =
      finalServicePrice > 0
        ? Math.round(finalServicePrice * 0.35)
        : depositInfo.amount
  }

  const remainingAmount = Math.max(finalServicePrice - depositAmount, 0)
  const remainingFormatted =
    remainingAmount > 0 ? `KSH ${remainingAmount.toLocaleString()}` : 'KSH 0'
  
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
  const serviceDuration = serviceDurations[service] || 90 // Default to 90 minutes
  const endTime = new Date(appointmentTime)
  endTime.setMinutes(endTime.getMinutes() + serviceDuration)
  const formattedEndTime = endTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
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

  const transferNote =
    typeof bookingData.transferFromName === 'string' && bookingData.transferFromName.trim().length > 0
      ? `${bookingData.transferFromName.trim()} has transferred this LashDiary appointment to you. Please review the details below and feel free to reschedule if needed.`
      : ''
  const transferFinancialNote =
    transferNote && depositAmount > 0
      ? `A deposit of ${depositFormatted} is already on file for this service. The remaining balance of ${remainingFormatted} will be collected after your appointment.`
      : transferNote
      ? 'The remaining balance will be collected after your appointment.'
      : ''

  const eventSummary = `LashDiary Appointment – ${service || 'Lash Service'}`
  const desiredLookLabel = desiredLook
    .split('-')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
  const lashMapStatusMessage =
    desiredLookStatus === 'recommended'
      ? 'Lash map ready, can plan before arrival.'
      : 'Picked outside recommended, map will be decided at appointment.'
  const eyeShapeRecommendations = Array.isArray(eyeShape.recommendedStyles)
    ? eyeShape.recommendedStyles
    : []
  
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
    addToCalendarLink,
    eyeShapeLabel: eyeShape.label,
    recommendedStyles: eyeShapeRecommendations,
    desiredLookLabel,
    lashMapStatusMessage,
    adminBookingLink,
  }

  const baseOwnerEmailHtml = createOwnerEmailTemplate(ownerEmailTemplateData)
  let ownerEmailHtml = baseOwnerEmailHtml

  const hasZoho = Boolean(zohoTransporter)

  if (!hasZoho) {
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

  if (hasZoho) {
    try {
      console.log('📧 Attempting to send emails via Zoho SMTP...')
      const transporter = zohoTransporter!
      const zohoFromEmail = ZOHO_FROM_EMAIL || ZOHO_SMTP_USER || FROM_EMAIL
      const fromAddress = `${EMAIL_FROM_NAME} <${zohoFromEmail}>`

      if (email) {
        try {
          const customerResult = await transporter.sendMail({
            from: fromAddress,
            to: email,
            replyTo: OWNER_EMAIL,
            subject: 'Appointment Confirmation - LashDiary',
            html: createCustomerEmailTemplate({
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
              transferNote,
              transferFinancialNote,
              eyeShapeLabel: eyeShape.label,
              eyeShapeRecommendations,
              desiredLookLabel,
              lashMapStatusMessage,
            }),
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
          } else {
            customerEmailStatus = 'pending'
            customerEmailError = 'Zoho SMTP accepted the message but did not return a delivery ID.'
            console.warn('⚠️ Customer email status pending via Zoho SMTP.')
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
        subject: `New Booking Request - ${name}`,
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
}

