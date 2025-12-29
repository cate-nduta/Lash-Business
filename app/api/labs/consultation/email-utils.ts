import {
  getZohoTransporter,
  isZohoConfigured,
  BUSINESS_NOTIFICATION_EMAIL,
  FROM_EMAIL,
  EMAIL_FROM_NAME,
} from '@/lib/email/zoho-config'
import { formatCurrency, type Currency } from '@/lib/currency-utils'
import type { ConsultationSubmission } from './route'

// Helper function to parse time string and convert to 24-hour format
function parseTimeString(timeStr: string): { hour: number; minute: number } {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error(`Invalid time string: ${timeStr}`)
  }
  
  const normalizedTime = timeStr.trim().toLowerCase()
  let hour = 10 // Default to 10 AM
  let minute = 0
  
  // Try to parse time formats like "9:30 AM", "12:00 PM", "3:30 PM", "9:30AM" (no space)
  const timeMatch = normalizedTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i) || 
                    normalizedTime.match(/(\d{1,2}):(\d{2})(am|pm)/i)
  
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10)
    minute = parseInt(timeMatch[2], 10)
    const period = timeMatch[3].toLowerCase()
    
    // Validate hour and minute
    if (isNaN(hour) || hour < 0 || hour > 12) {
      throw new Error(`Invalid hour in time: ${timeStr}`)
    }
    if (isNaN(minute) || minute < 0 || minute > 59) {
      throw new Error(`Invalid minute in time: ${timeStr}`)
    }
    
    // Convert to 24-hour format
    if (period === 'pm' && hour !== 12) {
      hour += 12
    } else if (period === 'am' && hour === 12) {
      hour = 0
    }
  } else {
    // Fallback: try to match common patterns or extract hour:minute from strings
    // Handle formats like "9:30", "12:00", "15:30" (24-hour format)
    const hourMinuteMatch = normalizedTime.match(/(\d{1,2}):(\d{2})/)
    if (hourMinuteMatch) {
      hour = parseInt(hourMinuteMatch[1], 10)
      minute = parseInt(hourMinuteMatch[2], 10)
      
      // If hour > 12, assume it's already in 24-hour format
      // Otherwise, check if it's likely PM based on context
      if (hour <= 12 && (normalizedTime.includes('pm') || normalizedTime.includes('afternoon') || normalizedTime.includes('evening'))) {
        if (hour !== 12) hour += 12
      }
    } else {
      // Last resort: try to match common time patterns
      if (normalizedTime.includes('9:30') || normalizedTime.includes('9.30') || normalizedTime.includes('morning')) {
        hour = 9
        minute = 30
      } else if (normalizedTime.includes('12:00') || normalizedTime.includes('12.00') || normalizedTime.includes('noon') || normalizedTime.includes('12pm')) {
        hour = 12
        minute = 0
      } else if (normalizedTime.includes('3:30') || normalizedTime.includes('3.30') || normalizedTime.includes('15:30') || normalizedTime.includes('afternoon')) {
        hour = 15
        minute = 30
      } else {
        // If we can't parse, throw an error to catch issues early
        throw new Error(`Unable to parse time format: ${timeStr}`)
      }
    }
  }
  
  // Final validation
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time values: hour=${hour}, minute=${minute} from ${timeStr}`)
  }
  
  return { hour, minute }
}

// Create date in Nairobi timezone (UTC+3) explicitly
function createDateInNairobiTimezone(dateStr: string, timeStr: string): Date {
  // Parse date string (expected format: YYYY-MM-DD)
  const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
  if (!dateMatch) {
    throw new Error(`Invalid date format: ${dateStr}`)
  }
  
  // Parse date components (YYYY-MM-DD format)
  const [year, month, day] = dateMatch[1].split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${dateStr}`)
  }
  
  // Parse time
  const { hour, minute } = parseTimeString(timeStr)
  
  // Create date string in Nairobi timezone format: YYYY-MM-DDTHH:MM:00+03:00
  // This ensures the time is interpreted as Nairobi time (UTC+3)
  const nairobiDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`
  const date = new Date(nairobiDateStr)
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`)
  }
  
  return date
}

// Generate Google Calendar link with correct time
function buildGoogleCalendarLink(data: ConsultationSubmission): string {
  const startDate = createDateInNairobiTimezone(data.preferredDate, data.preferredTime)
  // Add 1 hour to start date for end time (using UTC milliseconds to avoid timezone issues)
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // Add 1 hour in milliseconds
  
  // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ in UTC)
  const formatGoogleCalendarDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }
  
  const startDateStr = formatGoogleCalendarDate(startDate)
  const endDateStr = formatGoogleCalendarDate(endDate)
  
  const eventTitle = encodeURIComponent(`Consultation with ${data.businessName}`)
  const eventLocation = data.meetingType === 'online' 
    ? 'Online Consultation'
    : data.meetingCountry && data.meetingCity && data.meetingBuilding && data.meetingStreet
      ? encodeURIComponent(`${data.meetingBuilding}, ${data.meetingStreet}, ${data.meetingCity}, ${data.meetingCountry}`)
      : 'LashDiary Labs'
  
  const eventDetails = encodeURIComponent(
    `Consultation with ${data.contactName} from ${data.businessName}\n\n` +
    `Meeting Type: ${data.meetingType === 'online' ? 'Online' : 'Physical'}\n\n` +
    `Business: ${data.businessName}\n` +
    `Contact: ${data.contactName}\n` +
    `Email: ${data.email}\n` +
    `Phone: ${data.phone}`
  )
  
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startDateStr}/${endDateStr}&location=${eventLocation}&details=${eventDetails}`
}

// Generate iCal calendar file
function generateCalendarEvent(data: ConsultationSubmission, meetLink?: string | null): string {
  const startDate = createDateInNairobiTimezone(data.preferredDate, data.preferredTime)
  // Add 1 hour to start date for end time (using UTC milliseconds to avoid timezone issues)
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // Add 1 hour in milliseconds

  const formatICSDate = (date: Date): string => {
    // Convert to UTC for ICS format (Z suffix means UTC)
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  // For online meetings, location is just text - NO direct Meet link
  const location = data.meetingType === 'online' 
    ? 'Online Consultation' // Just text, no link
    : data.meetingCountry && data.meetingCity && data.meetingBuilding && data.meetingStreet
      ? `${data.meetingBuilding}, ${data.meetingStreet}, ${data.meetingCity}, ${data.meetingCountry}`
      : 'LashDiary Labs'
  
  // Use time-gated link in description (NOT direct Meet link)
  const timeGatedLink = data.consultationId 
    ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'}/labs/meet/${data.consultationId}`
    : null
  const description = `Consultation with ${data.contactName} from ${data.businessName}\\n\\nMeeting Type: ${data.meetingType === 'online' ? 'Online' : 'Physical'}\\n\\nBusiness: ${data.businessName}\\nContact: ${data.contactName}\\nEmail: ${data.email}\\nPhone: ${data.phone}${timeGatedLink ? `\\n\\n🔒 SECURE MEETING LINK (Time-Gated):\\n${timeGatedLink}\\n\\n⚠️ IMPORTANT: Use ONLY this link to join. This link only works during your scheduled time slot. Do NOT use any direct Google Meet links - they will not work outside your scheduled time.` : '\\n\\nMeeting link will be sent via email.'}`

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LashDiary Labs//Consultation Booking//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:consultation-${data.consultationId || Date.now()}@lashdiary.co.ke
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Consultation with ${data.businessName}
DESCRIPTION:${description}
LOCATION:${location}
ORGANIZER;CN=LashDiary Labs:mailto:${BUSINESS_NOTIFICATION_EMAIL}
ATTENDEE;CN=${data.contactName};RSVP=TRUE:mailto:${data.email}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`
}

export async function sendConsultationEmail(data: ConsultationSubmission) {
  if (!isZohoConfigured()) {
    console.warn('Zoho email not configured, skipping email notification')
    return
  }

  const transporter = getZohoTransporter()
  if (!transporter) {
    console.warn('Email transporter not available')
    return
  }

  // Use the Meet link stored in consultation data (already set during creation)
  // Generate time-gated link for email
  const meetLink = data.meetLink || null
  const timeGatedLink = meetLink && data.consultationId 
    ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'}/labs/meet/${data.consultationId}`
    : null

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not specified'
    try {
      // Parse date string (expected format: YYYY-MM-DD)
      // Extract just the date part to avoid timezone issues
      const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (dateMatch) {
        const [year, month, day] = dateMatch[1].split('-').map(Number)
        
        // Create date in UTC to avoid any timezone conversion issues
        // This ensures the date is displayed exactly as provided, without any time component
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
        
        // Format date WITHOUT time - only date components
        // Using UTC ensures no timezone conversion adds unwanted time
        const formatted = date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        })
        return formatted
      }
      // Fallback: try parsing as-is, but extract only date part
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      // Extract only date components to avoid any time display
      const year = date.getUTCFullYear()
      const month = date.getUTCMonth()
      const day = date.getUTCDate()
      const dateOnly = new Date(Date.UTC(year, month, day, 12, 0, 0))
      return dateOnly.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Not specified'
    // Return the actual time string as-is (e.g., "9:30 AM", "12:00 PM", "3:30 PM")
    // No more hardcoded mappings - use the exact time that was booked
    return timeStr.trim()
  }

  const businessTypeMap: Record<string, string> = {
    'lash-studio': 'Lash Studio',
    'beauty-salon': 'Beauty Salon',
    'spa': 'Spa',
    'nail-salon': 'Nail Salon',
    'hair-salon': 'Hair Salon',
    'barbershop': 'Barbershop',
    'wellness-center': 'Wellness Center',
    'fitness-studio': 'Fitness Studio',
    'other-service': 'Other Service Business',
  }

  const hasWebsiteMap: Record<string, string> = {
    'no': "No, I don't have a website",
    'yes-basic': "Yes, but it's very basic",
    'yes-functional': "Yes, it's functional but needs improvement",
    'yes-good': "Yes, it's good but missing features",
  }

  const preferredContactMap: Record<string, string> = {
    email: 'Email',
    phone: 'Phone call',
    whatsapp: 'WhatsApp',
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #FDF9F4;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FDF9F4; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 32px; background: linear-gradient(135deg, #7C4B31 0%, #9D6B4F 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin:0; color: #FFFFFF; font-size: 28px; font-weight: bold;">
                🎯 New Labs Consultation Request
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin:0 0 24px 0; color: #7C4B31; font-size: 20px; border-bottom: 2px solid #F3E6DC; padding-bottom: 12px;">
                Business Information
              </h2>
              
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600; width: 180px;">Business Name:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${data.businessName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Contact Name:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${data.contactName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Email:</td>
                  <td style="padding: 8px 0; color: #3E2A20;"><a href="mailto:${data.email}" style="color: #7C4B31; text-decoration: none;">${data.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Phone:</td>
                  <td style="padding: 8px 0; color: #3E2A20;"><a href="tel:${data.phone}" style="color: #7C4B31; text-decoration: none;">${data.phone}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Business Type:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${businessTypeMap[data.businessType] || data.businessType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Services Offered:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${data.serviceType}</td>
                </tr>
              </table>

              <h2 style="margin:24px 0 16px 0; color: #7C4B31; font-size: 20px; border-bottom: 2px solid #F3E6DC; padding-bottom: 12px;">
                Current Operations
              </h2>
              
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600; width: 180px;">Has Website:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${hasWebsiteMap[data.hasWebsite] || data.hasWebsite}</td>
                </tr>
                ${data.currentWebsite ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Current Website:</td>
                  <td style="padding: 8px 0; color: #3E2A20;"><a href="${data.currentWebsite}" target="_blank" style="color: #7C4B31; text-decoration: none;">${data.currentWebsite}</a></td>
                </tr>
                ` : ''}
                ${data.monthlyClients ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Monthly Clients:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${data.monthlyClients}</td>
                </tr>
                ` : ''}
                ${data.currentBookingSystem ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Booking System:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${data.currentBookingSystem}</td>
                </tr>
                ` : ''}
                ${data.currentPaymentSystem ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Payment System:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${data.currentPaymentSystem}</td>
                </tr>
                ` : ''}
              </table>

              <h2 style="margin:24px 0 16px 0; color: #7C4B31; font-size: 20px; border-bottom: 2px solid #F3E6DC; padding-bottom: 12px;">
                Pain Points & Goals
              </h2>
              
              <div style="background-color: #F3E6DC; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin:0; color: #3E2A20; line-height: 1.6; white-space: pre-wrap;">${data.mainPainPoints}</p>
              </div>

              <h2 style="margin:24px 0 16px 0; color: #7C4B31; font-size: 20px; border-bottom: 2px solid #F3E6DC; padding-bottom: 12px;">
                Project Details
              </h2>
              
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                ${data.interestedTier ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600; width: 180px;">Interested Tier:</td>
                  <td style="padding: 8px 0; color: #3E2A20; font-weight: 600;">${data.interestedTier}</td>
                </tr>
                ` : ''}
                ${data.budgetRange ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600; width: 180px;">Budget Range:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${data.budgetRange}</td>
                </tr>
                ` : ''}
                ${data.timeline ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Timeline:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${data.timeline}</td>
                </tr>
                ` : ''}
              </table>

              <h2 style="margin:24px 0 16px 0; color: #7C4B31; font-size: 20px; border-bottom: 2px solid #F3E6DC; padding-bottom: 12px;">
                Consultation Preferences
              </h2>
              
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600; width: 180px;">Preferred Contact:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${preferredContactMap[data.preferredContact] || data.preferredContact}</td>
                </tr>
                ${data.preferredDate ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Preferred Date:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${formatDate(data.preferredDate)}</td>
                </tr>
                ` : ''}
                ${data.preferredTime ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Preferred Time:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${formatTime(data.preferredTime)}</td>
                </tr>
                ` : ''}
                ${data.preferredDate && data.preferredTime ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600; vertical-align: top;">Consultation Slot:</td>
                  <td style="padding: 8px 0; color: #3E2A20; font-weight: 600; font-size: 16px;">${formatDate(data.preferredDate)} at ${formatTime(data.preferredTime)}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Meeting Type:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">${data.meetingType === 'online' ? 'Online (Video Call)' : 'Physical (In-Person)'}</td>
                </tr>
                ${data.meetingType === 'physical' && data.meetingCountry && data.meetingCity && data.meetingBuilding && data.meetingStreet ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600; vertical-align: top;">Meeting Location:</td>
                  <td style="padding: 8px 0; color: #3E2A20;">
                    ${data.meetingBuilding}<br>
                    ${data.meetingStreet}<br>
                    ${data.meetingCity}, ${data.meetingCountry}
                  </td>
                </tr>
                ` : ''}
              </table>

              ${data.additionalDetails ? `
              <h2 style="margin:24px 0 16px 0; color: #7C4B31; font-size: 20px; border-bottom: 2px solid #F3E6DC; padding-bottom: 12px;">
                Additional Details
              </h2>
              <div style="background-color: #F3E6DC; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin:0; color: #3E2A20; line-height: 1.6; white-space: pre-wrap;">${data.additionalDetails}</p>
              </div>
              ` : ''}

              <div style="background-color: #7C4B31; color: #FFFFFF; padding: 16px; border-radius: 8px; margin-top: 24px; text-align: center;">
                <p style="margin:0; font-size: 18px; font-weight: bold;">
                  Consultation Price: ${formatCurrency(data.consultationPrice, data.currency as Currency)}
                </p>
                <p style="margin:8px 0 0 0; font-size: 14px; opacity: 0.9;">
                  Submitted: ${new Date(data.submittedAt).toLocaleString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 24px 32px; background-color: #F3E6DC; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin:0; color: #6B4A3B; font-size: 14px;">
                Please contact this client within 24 hours to schedule their consultation.
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

  // Generate calendar event (with Meet link if available)
  const calendarEvent = generateCalendarEvent(data, meetLink)
  
  // Generate Google Calendar link with correct time
  const googleCalendarLink = buildGoogleCalendarLink(data)

  try {
    // Send notification email to business
    await transporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: BUSINESS_NOTIFICATION_EMAIL,
      subject: `🎯 New Labs Consultation Request: ${data.businessName}`,
      html,
      text: `
New Labs Consultation Request

Business: ${data.businessName}
Contact: ${data.contactName}
Email: ${data.email}
Phone: ${data.phone}
Business Type: ${businessTypeMap[data.businessType] || data.businessType}
Services: ${data.serviceType}
Meeting Type: ${data.meetingType === 'online' ? 'Online' : 'Physical'}
Date: ${formatDate(data.preferredDate)}
Time: ${formatTime(data.preferredTime)}
${data.interestedTier ? `Interested Tier: ${data.interestedTier}` : ''}

Pain Points:
${data.mainPainPoints}

Consultation Price: ${formatCurrency(data.consultationPrice, data.currency as Currency)}
Submitted: ${new Date(data.submittedAt).toLocaleString()}
      `.trim(),
      attachments: [
        {
          filename: 'consultation.ics',
          content: calendarEvent,
          contentType: 'text/calendar; charset=UTF-8; method=REQUEST',
        },
      ],
    })

    // Send confirmation email to client
    const clientEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #FDF9F4;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FDF9F4; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 32px; background: linear-gradient(135deg, #7C4B31 0%, #9D6B4F 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin:0; color: #FFFFFF; font-size: 28px; font-weight: bold;">
                We're Excited to Work With You!
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 32px;">
              <p style="margin:0 0 24px 0; font-size: 16px; line-height: 1.6; color: #3E2A20;">
                Hi ${data.contactName},
              </p>
              
              <p style="margin:0 0 24px 0; font-size: 16px; line-height: 1.6; color: #3E2A20;">
                Thank you for booking a consultation with LashDiary Labs! We're excited to help you set up a better system for your business.
              </p>

              <div style="background-color: #F3E6DC; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #7C4B31;">
                <h2 style="margin:0 0 16px 0; color: #7C4B31; font-size: 20px; font-weight: bold;">
                  📅 Consultation Details
                </h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600; width: 140px;">Date:</td>
                    <td style="padding: 8px 0; color: #3E2A20; font-size: 16px; font-weight: 600;">${formatDate(data.preferredDate)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Time:</td>
                    <td style="padding: 8px 0; color: #3E2A20; font-size: 16px; font-weight: 600;">${formatTime(data.preferredTime)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6B4A3B; font-weight: 600;">Meeting Type:</td>
                    <td style="padding: 8px 0; color: #3E2A20; font-size: 16px; font-weight: 600;">${data.meetingType === 'online' ? 'Online (Video Call)' : 'Physical (In-Person)'}</td>
                  </tr>
                  ${data.meetingType === 'online' ? `
                  ${timeGatedLink ? `
                  <tr>
                    <td colspan="2" style="padding: 12px 0 0 0;">
                      <div style="background-color: #e8f0fe; padding: 20px; border-radius: 8px; border: 2px solid #1a73e8; margin-top: 12px;">
                        <p style="margin:0 0 16px 0; color: #1a73e8; font-size: 18px; font-weight: 700;">
                          📹 Your Secure Meeting Link
                        </p>
                        <div style="background-color: #ffffff; padding: 16px; border-radius: 6px; border: 1px solid #1a73e8; margin-bottom: 12px;">
                          <a href="${timeGatedLink}" target="_blank" style="display: inline-block; background-color: #1a73e8; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 12px;">
                            🎥 Join Your Consultation Meeting →
                          </a>
                          <p style="margin:12px 0 0 0; color: #5f6368; font-size: 13px; line-height: 1.6;">
                            <strong>🔒 Secure Access:</strong> This link will only work during your scheduled time slot (${formatTime(data.preferredTime)} on ${formatDate(data.preferredDate)}). This ensures your privacy and prevents unauthorized access.
                          </p>
                          <p style="margin:12px 0 0 0; color: #d32f2f; font-size: 12px; line-height: 1.6; background-color: #ffebee; padding: 10px; border-radius: 4px; border: 1px solid #ffcdd2;">
                            ⚠️ <strong>Security:</strong> Do not copy or share the meeting URL from your browser - this link is unique to your consultation only.
                          </p>
                        </div>
                        <p style="margin:0 0 8px 0; color: #5f6368; font-size: 13px; line-height: 1.5;">
                          <strong>Your Secure Meeting Link:</strong>
                        </p>
                        <p style="margin:0; color: #1a73e8; font-size: 12px; line-height: 1.5; word-break: break-all; background-color: #ffffff; padding: 8px; border-radius: 4px; border: 1px solid #dadce0;">
                          ${timeGatedLink}
                        </p>
                      </div>
                    </td>
                  </tr>
                  ` : `
                  <tr>
                    <td colspan="2" style="padding: 12px 0 0 0;">
                      <div style="background-color: #fff3cd; padding: 16px; border-radius: 8px; border: 2px solid #ffc107; margin-top: 12px;">
                        <p style="margin:0 0 8px 0; color: #856404; font-size: 14px; font-weight: 600;">
                          ⚠️ Google Meet Link
                        </p>
                        <p style="margin:0 0 8px 0; color: #856404; font-size: 13px; line-height: 1.5;">
                          We're setting up your meeting link. Please check your email shortly for the Google Meet link, or reply to this email and we'll send it to you immediately.
                        </p>
                        <p style="margin:0; color: #856404; font-size: 12px; line-height: 1.5;">
                          <strong>Need help?</strong> Reply to this email or call us at your scheduled time.
                        </p>
                      </div>
                    </td>
                  </tr>
                  `}
                  ` : `
                  <tr>
                    <td colspan="2" style="padding: 12px 0 0 0; color: #6B4A3B; font-size: 14px;">
                      ${data.meetingCountry && data.meetingCity && data.meetingBuilding && data.meetingStreet ? `
                        📍 <strong>Meeting Location:</strong><br>
                        ${data.meetingBuilding}<br>
                        ${data.meetingStreet}<br>
                        ${data.meetingCity}, ${data.meetingCountry}
                      ` : '📍 Physical meeting location details will be confirmed via email.'}
                    </td>
                  </tr>
                  `}
                </table>
              </div>

              <div style="background-color: #7C4B31; color: #FFFFFF; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                <p style="margin:0; font-size: 16px; font-weight: 600;">
                  Consultation Fee: ${formatCurrency(data.consultationPrice, data.currency as Currency)}
                </p>
                <p style="margin:8px 0 0 0; font-size: 14px; opacity: 0.9;">
                  If you proceed with a package, this fee will be credited back to your total package price.
                </p>
              </div>

              <div style="margin:0 0 16px 0; text-align: center;">
                <p style="margin:0 0 12px 0; font-size: 15px; line-height: 1.6; color: #3E2A20;">
                  <strong>📎 Add to Calendar:</strong>
                </p>
                <a href="${googleCalendarLink}" target="_blank" style="display: inline-block; background-color: #4285F4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-bottom: 12px;">
                  Add to Google Calendar
                </a>
                <p style="margin:12px 0 0 0; font-size: 13px; color: #6B4A3B; line-height: 1.5;">
                  We've also attached a calendar event file (.ics) to this email. You can download it and add it to your calendar to ensure you don't miss the consultation.
                </p>
              </div>

              <p style="margin:0 0 24px 0; font-size: 15px; line-height: 1.6; color: #3E2A20;">
                We'll be in touch soon with more details. If you have any questions, feel free to reply to this email.
              </p>

              <p style="margin:0; font-size: 15px; line-height: 1.6; color: #3E2A20;">
                Best regards,<br>
                <strong style="color: #7C4B31;">The LashDiary Labs Team</strong>
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

    // Send confirmation email to client if:
    // 1. Payment is confirmed (paid or not_required), OR
    // 2. Consultation status is confirmed (for free consultations or when called from route handler)
    // This ensures emails are sent for both free and paid consultations
    const paymentConfirmed = data.paymentStatus === 'paid' || data.paymentStatus === 'not_required'
    const consultationConfirmed = data.status === 'confirmed'
    
    if (!paymentConfirmed && !consultationConfirmed) {
      console.warn('⚠️ Skipping client consultation confirmation email - consultation not confirmed yet:', {
        consultationId: data.consultationId,
        email: data.email,
        paymentStatus: data.paymentStatus,
        status: data.status,
        note: 'Business notification email was already sent above. Client confirmation will be sent after consultation is confirmed.',
      })
      return
    }
    
    console.log('✅ Sending client consultation confirmation email:', {
      consultationId: data.consultationId,
      email: data.email,
      paymentStatus: data.paymentStatus,
      status: data.status,
      paymentConfirmed,
      consultationConfirmed,
    })

    await transporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.email,
      subject: `✅ Consultation Confirmed - ${formatDate(data.preferredDate)} at ${formatTime(data.preferredTime)}`,
      html: clientEmailHtml,
      text: `
Consultation Confirmed

Hi ${data.contactName},

Thank you for booking a consultation with LashDiary Labs!

Date: ${formatDate(data.preferredDate)}
Time: ${formatTime(data.preferredTime)}
Meeting Type: ${data.meetingType === 'online' ? 'Online (Video Call)' : 'Physical (In-Person)'}
${data.meetingType === 'online' ? (timeGatedLink ? `\n\n📹 YOUR SECURE MEETING LINK:\n${timeGatedLink}\n\n🔒 Secure Access: This link will only work during your scheduled time slot (${formatTime(data.preferredTime)} on ${formatDate(data.preferredDate)}). This ensures your privacy and prevents unauthorized access.\n\nClick the link above to join your consultation meeting at your scheduled time.\n\nIf you have any issues joining, please reply to this email or call us.` : `\n\n📹 Google Meet Link:\nWe're setting up your meeting link. Please check your email shortly for the Google Meet link, or reply to this email and we'll send it to you immediately.\n\nIf you need help, reply to this email or call us at your scheduled time.`) : ''}

Consultation Fee: ${formatCurrency(data.consultationPrice, data.currency as Currency)}
If you proceed with a package, this fee will be credited back to your total package price.

We've attached a calendar event file (.ics) to this email. You can download it and add it to your calendar.

Best regards,
The LashDiary Labs Team
      `.trim(),
      attachments: [
        {
          filename: 'consultation.ics',
          content: calendarEvent,
          contentType: 'text/calendar; charset=UTF-8; method=REQUEST',
        },
      ],
    })
  } catch (error) {
    console.error('Error sending consultation email:', error)
    throw error
  }
}

