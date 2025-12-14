import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'
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

// Format date for Google Calendar
function formatGoogleCalendarDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

// Build Google Calendar link
function buildGoogleCalendarLink(options: {
  summary: string
  start: Date
  end: Date
  location: string
  description: string
  reminderMinutes?: number
}): string {
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

// Parse appointment date and time from date string and time object
function parseAppointmentDateTime(dateStr: string, timeObj: { hours: string; minutes: string; ampm: string }): { start: Date; end: Date } | null {
  if (!dateStr || !timeObj) return null
  
  try {
    // Parse the date string (YYYY-MM-DD format from date input)
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    
    // Parse time components
    let hour24 = parseInt(timeObj.hours)
    if (timeObj.ampm.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12
    if (timeObj.ampm.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0
    
    const minutes = parseInt(timeObj.minutes)
    
    // Create date with time in local timezone (will be converted to UTC for calendar)
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour24, minutes, 0)
    
    // Model appointments are 3-4 hours, use 3.5 hours (210 minutes) as default
    const end = new Date(start.getTime() + 3.5 * 60 * 60 * 1000)
    
    return { start, end }
  } catch (error) {
    console.error('Error parsing appointment date/time:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const { applicationId, message, appointmentDateTime, appointmentDate, appointmentTime } = body

    // Load model applications
    const data = await readDataFile<{ applications: any[] }>('model-applications.json', { applications: [] })
    const application = data.applications.find((app: any) => app.id === applicationId)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get location from contact settings
    const contact = await readDataFile<{ location?: string }>('contact.json', {})
    const location = contact?.location || process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'

    // Escape user inputs
    const safeFirstName = escapeHtml(application.firstName || 'there')
    const safeMessage = message ? escapeHtml(message) : ''
    const safeAppointmentDateTime = appointmentDateTime ? escapeHtml(appointmentDateTime) : ''
    const safeLocation = escapeHtml(location)
    
    // Generate calendar link if appointment date/time is provided
    let calendarLink: string | null = null
    if (appointmentDate && appointmentTime) {
      const parsedDateTime = parseAppointmentDateTime(appointmentDate, appointmentTime)
      if (parsedDateTime) {
        calendarLink = buildGoogleCalendarLink({
          summary: 'LashDiary Model Appointment',
          start: parsedDateTime.start,
          end: parsedDateTime.end,
          location: location,
          description: `Model appointment with LashDiary.\n\nPlease arrive on time with clean lashes and no makeup.\n\nLocation: ${location}`,
          reminderMinutes: 1440, // 24 hours before
        })
      }
    }

    // Create selection email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Been Selected! - LashDiary</title>
</head>
<body style="margin:0; padding:0; background:#FDF9F4; font-family: 'DM Serif Text', Georgia, serif; color:#7C4B31;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FDF9F4; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:#FFFFFF; border-radius:18px; border:1px solid #E8D5C4; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:#FFFFFF;">
              <h1 style="margin:0; font-size:32px; color:#7C4B31; font-family:'Playfair Display', Georgia, serif; font-weight:600;">Congratulations! We'd Love to Work With You!</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                Hey ${safeFirstName},
              </p>
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                Great news! You've been selected as a LashDiary model! We're excited to work with you.
              </p>
              
              ${safeMessage ? '<div style="background:#F5F1EB; border-left:4px solid #7C4B31; padding:16px; margin:20px 0; border-radius:8px;"><p style="margin:0; font-size:15px; line-height:1.6; color:#7C4B31; white-space:pre-wrap;">' + safeMessage.replace(/\n/g, '<br>') + '</p></div>' : ''}
              
              <p style="margin:24px 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                Before your appointment, please take a moment to read through the preparation guidelines. These help the session run smoothly and keep you comfortable during the longer model appointment.
              </p>
              
              <div style="background:#F5F1EB; border-left:4px solid #7C4B31; padding:16px; margin:20px 0; border-radius:8px;">
                <p style="margin:0 0 12px 0; font-size:15px; font-weight:600; color:#7C4B31;">Before You Arrive:</p>
                <ul style="margin:8px 0 0 0; padding-left:20px; font-size:14px; line-height:1.8; color:#7C4B31;">
                  <li>Avoid caffeine at least 3–4 hours before your appointment. Caffeine can make your eyes flutter and your body restless, which makes the process uncomfortable for you.</li>
                  <li>Come well-fed. Model sets take longer than regular lash appointments, so having a meal beforehand will help you stay comfortable.</li>
                  <li>Use the washroom before your appointment begins. Once we start, you'll be lying down for an extended period.</li>
                  <li>Arrive with clean eyes and no makeup. Please come with no mascara, eyeliner, or skincare around the eye area.</li>
                  <li>Avoid oils or heavy skincare products near your eyes for 24 hours before the appointment.</li>
                  <li>If you wear contacts, bring a case so you can remove them before we start.</li>
                  <li>Please arrive on time. Late arrivals may require rescheduling.</li>
                </ul>
              </div>
              
              <div style="background:#F5F1EB; border-left:4px solid #7C4B31; padding:16px; margin:20px 0; border-radius:8px;">
                <p style="margin:0 0 12px 0; font-size:15px; font-weight:600; color:#7C4B31;">During the Appointment:</p>
                <p style="margin:0; font-size:14px; line-height:1.6; color:#7C4B31;">
                  You'll be lying down for 2.5–4 hours, depending on the style we're practicing. Feel free to bring a sweater or dress comfortably. I'll guide you through everything once you arrive.
                </p>
              </div>
              
              <div style="background:#F5F1EB; border-left:4px solid #7C4B31; padding:16px; margin:20px 0; border-radius:8px;">
                <p style="margin:0 0 8px 0; font-size:15px; font-weight:600; color:#7C4B31;">Location:</p>
                <p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#7C4B31;">
                  ${safeLocation}
                </p>
                ${safeAppointmentDateTime ? '<p style="margin:0 0 8px 0; font-size:15px; font-weight:600; color:#7C4B31;">Date & Time:</p><p style="margin:0; font-size:14px; line-height:1.6; color:#7C4B31;">' + safeAppointmentDateTime + '</p>' : ''}
              </div>
              
              ${calendarLink ? `
              <div style="margin:24px 0; text-align:center;">
                <a href="${calendarLink}" style="display:inline-block; padding:12px 28px; background:#7C4B31; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:15px;" target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
              </div>
              <p style="margin:12px 0 0 0; font-size:13px; color:#7C4B31; text-align:center; opacity:0.8;">Need a reminder? Use the button above to add the appointment with a 24-hour alert.</p>
              ` : ''}
              
              <p style="margin:24px 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                Please reply to this email to confirm your appointment within 24 hours.
              </p>
              
              <p style="margin:18px 0 0 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                I'm looking forward to working with you and creating something beautiful.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Send email
    if (zohoTransporter) {
      try {
        const info = await zohoTransporter.sendMail({
          from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
          to: application.email,
          subject: 'You\'ve Been Selected as a LashDiary Model!',
          html: emailHtml,
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high',
          },
        })
        console.log('Selection email sent successfully:', info.messageId)
        return NextResponse.json({ success: true, message: 'Selection email sent successfully', messageId: info.messageId })
      } catch (emailError: any) {
        console.error('Error sending selection email:', emailError)
        return NextResponse.json({ 
          error: 'Failed to send email', 
          details: emailError?.message || String(emailError) 
        }, { status: 500 })
      }
    } else {
      console.error('Zoho SMTP is not configured. Please set ZOHO_SMTP_USER and ZOHO_SMTP_PASS in your environment variables.')
      return NextResponse.json({ 
        error: 'Email service not configured. Please set ZOHO_SMTP_USER and ZOHO_SMTP_PASS in your environment variables.' 
      }, { status: 500 })
    }
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error sending selection email:', error)
    return NextResponse.json({ 
      error: 'Failed to send email', 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}

