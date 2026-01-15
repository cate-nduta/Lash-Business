import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho } from '@/lib/email/zoho-config'
import { BUSINESS_NOTIFICATION_EMAIL } from '@/lib/email/zoho-config'
import type { BuildProject } from '@/app/api/admin/labs/build-projects/route'
import crypto from 'crypto'

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

const BASE_URL = normalizeBaseUrl()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, clientName, clientEmail, clientPhone, meetingType, date, time, clientTimezone, clientCountry } = body

    if (!token || !clientName || !clientEmail || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find project by token - first check build projects, then orders
    // Direct match works for both new readable format and old hex format
    const projects = await readDataFile<BuildProject[]>('labs-build-projects.json', [])
    const projectIndex = projects.findIndex(p => p.showcaseBookingToken === token)
    let project: any = null
    let isOrder = false

    if (projectIndex !== -1) {
      project = projects[projectIndex]
    } else {
      // Try to find in orders (direct match works for both new readable format and old hex format)
      const orders = await readDataFile<any[]>('labs-web-services-orders.json', [])
      const orderIndex = orders.findIndex(o => o.showcaseBookingToken === token)
      
      if (orderIndex !== -1) {
        const order = orders[orderIndex]
        // Convert order to project-like format
        project = {
          projectId: order.id,
          consultationId: '',
          invoiceId: '',
          businessName: order.businessName || order.name || order.email.split('@')[0],
          contactName: order.name || order.email.split('@')[0],
          email: order.email,
          phone: order.phoneNumber || '',
          tierName: 'Web Services',
          totalAmount: order.total || 0,
          currency: 'KES',
          showcaseBookingToken: order.showcaseBookingToken,
        }
        isOrder = true
      }
    }

    if (!project) {
      return NextResponse.json(
        { error: 'Invalid booking token' },
        { status: 404 }
      )
    }

    // Parse time from label (e.g., "9:30 AM" -> "09:30:00")
    const parseTimeLabel = (timeLabel: string): string => {
      try {
        // Try to parse as "HH:MM AM/PM" format
        const timeMatch = timeLabel.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10)
          const minutes = parseInt(timeMatch[2], 10)
          const period = timeMatch[3].toUpperCase()
          
          if (period === 'PM' && hours !== 12) {
            hours += 12
          } else if (period === 'AM' && hours === 12) {
            hours = 0
          }
          
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
        }
        
        // Try to parse as "HH:MM" format
        const timeMatch24 = timeLabel.match(/(\d{1,2}):(\d{2})/)
        if (timeMatch24) {
          const hours = parseInt(timeMatch24[1], 10)
          const minutes = parseInt(timeMatch24[2], 10)
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
        }
        
        // Default to 10:00 if parsing fails
        return '10:00:00'
      } catch {
        return '10:00:00'
      }
    }

    // Check if slot is still available
    const timeStr = parseTimeLabel(time)
    
    // Parse date and create proper datetime
    // Date should be in YYYY-MM-DD format
    const dateParts = date.split('-')
    if (dateParts.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid date format. Please try again.' },
        { status: 400 }
      )
    }
    
    const [year, month, day] = dateParts.map(Number)
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return NextResponse.json(
        { error: 'Invalid date format. Please try again.' },
        { status: 400 }
      )
    }
    
    // Parse time string (HH:MM:SS format)
    const timeParts = timeStr.split(':')
    if (timeParts.length < 2) {
      return NextResponse.json(
        { error: 'Invalid time format. Please try again.' },
        { status: 400 }
      )
    }
    
    const hours = parseInt(timeParts[0], 10)
    const minutes = parseInt(timeParts[1], 10)
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return NextResponse.json(
        { error: 'Invalid time format. Please try again.' },
        { status: 400 }
      )
    }
    
    // Create date object - use local time (server timezone should be set to Nairobi/EAT)
    // Format: YYYY-MM-DDTHH:MM:SS+03:00 for Nairobi timezone
    const slotDateTime = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+03:00`)
    
    // Validate the date
    if (isNaN(slotDateTime.getTime())) {
      return NextResponse.json(
        { error: `Invalid date or time. Date: ${date}, Time: ${time} (parsed as ${timeStr}). Please try again.` },
        { status: 400 }
      )
    }
    // Check for conflicts with consultations AND showcase bookings
    const consultationsData = await readDataFile<{ consultations: any[] }>('labs-consultations.json', { consultations: [] })
    const showcaseBookings = await readDataFile<any[]>('labs-showcase-bookings.json', [])
    
    // Normalize time for comparison
    const normalizeTimeForComparison = (timeStr: string): string => {
      if (!timeStr) return ''
      return timeStr.toLowerCase().trim()
    }
    
    // Parse the selected date to YYYY-MM-DD format (date is already in this format)
    const selectedDateStr = date // Already in YYYY-MM-DD format from frontend
    const selectedTimeLabel = time // This is the label like "9:30 AM"
    const selectedTimeNormalized = normalizeTimeForComparison(selectedTimeLabel)
    
    // Check consultations for conflicts
    const hasConsultationConflict = consultationsData.consultations.some((consultation: any) => {
      if (!consultation.preferredDate || !consultation.preferredTime) return false
      if (consultation.status === 'cancelled') return false
      
      const consultationDate = consultation.preferredDate
      const consultationTime = normalizeTimeForComparison(consultation.preferredTime)
      
      return consultationDate === selectedDateStr && 
             consultationTime === selectedTimeNormalized
    })
    
    // Check showcase bookings for conflicts
    // IMPORTANT: Check ALL non-cancelled bookings (not just confirmed) to prevent double booking
    const hasShowcaseConflict = showcaseBookings.some((booking: any) => {
      if (!booking.appointmentDate || !booking.appointmentTime) return false
      // Block ALL non-cancelled bookings (pending, confirmed, etc.) to prevent double booking
      if (booking.status?.toLowerCase() === 'cancelled') return false
      
      // Parse appointment date to YYYY-MM-DD format
      const appointmentDate = new Date(booking.appointmentDate)
      const appointmentDateStr = appointmentDate.toISOString().split('T')[0]
      const bookingTime = normalizeTimeForComparison(booking.appointmentTime)
      
      return appointmentDateStr === selectedDateStr && 
             bookingTime === selectedTimeNormalized
    })

    if (hasConsultationConflict || hasShowcaseConflict) {
      return NextResponse.json(
        { error: 'This time slot is already booked. Please select another date or time.' },
        { status: 409 }
      )
    }

    // Get admin-configured meeting link for online meetings
    let meetLink: string | null = null
    if (meetingType === 'online') {
      try {
        const labsSettings = await readDataFile<{ googleMeetRoom?: string }>('labs-settings.json', {})
        const adminMeetRoom = labsSettings.googleMeetRoom || process.env.STATIC_GOOGLE_MEET_ROOM || process.env.GOOGLE_MEET_ROOM || null
        if (adminMeetRoom && typeof adminMeetRoom === 'string' && adminMeetRoom.trim()) {
          meetLink = adminMeetRoom.trim()
        }
      } catch (error) {
        console.error('Error loading meeting link from settings:', error)
      }
    }

    // Create showcase booking
    const bookingId = `showcase-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    const showcaseBooking = {
      bookingId,
      projectId: project.projectId,
      consultationId: project.consultationId || '',
      clientName,
      clientEmail,
      clientPhone: clientPhone || project.phone || '',
      meetingType,
      appointmentDate: slotDateTime.toISOString(),
      appointmentTime: time,
      meetLink: meetLink || null,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      orderId: isOrder ? project.projectId : undefined,
      clientTimezone: typeof clientTimezone === 'string' && clientTimezone.trim() ? clientTimezone.trim() : 'Africa/Nairobi',
      clientCountry: typeof clientCountry === 'string' && clientCountry.trim() ? clientCountry.trim() : 'Unknown',
    }

    showcaseBookings.push(showcaseBooking)
    await writeDataFile('labs-showcase-bookings.json', showcaseBookings)

    // Update project or order
    if (isOrder) {
      // Update order
      const orders = await readDataFile<any[]>('labs-web-services-orders.json', [])
      const orderIndex = orders.findIndex(o => o.id === project.projectId)
      if (orderIndex !== -1) {
        const order = orders[orderIndex]
        order.showcaseBookingId = bookingId
        order.meetingLink = meetLink || order.meetingLink || ''
        orders[orderIndex] = order
        await writeDataFile('labs-web-services-orders.json', orders)
      }
    } else {
      // Update build project
      if (project.milestones) {
        project.milestones.showcaseMeetingScheduled = {
          date: new Date().toISOString(),
          notes: `Showcase meeting scheduled for ${date} at ${time} (${meetingType})`,
        }
      }
      project.showcaseBookingId = bookingId
      project.updatedAt = new Date().toISOString()
      projects[projectIndex] = project
      await writeDataFile('labs-build-projects.json', projects)
    }

    // Add to Google Calendar
    // IMPORTANT: Use slotDateTime (proper ISO format) instead of time label to ensure correct time in calendar
    // Pass skipEmail: true to prevent sending the salon booking email (we send our own Labs-specific email)
    try {
      const calendarResponse = await fetch(`${BASE_URL}/api/calendar/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName,
          email: clientEmail,
          phone: clientPhone || project.phone || '',
          service: `Showcase Meeting - ${project.businessName}`,
          date: date, // YYYY-MM-DD format
          timeSlot: slotDateTime.toISOString(), // Use actual ISO datetime (not label) to ensure correct time in Google Calendar
          location: meetingType === 'physical' ? 'LashDiary Studio, Nairobi, Kenya' : 'Online Meeting',
          bookingId,
          skipEmail: true, // Skip salon booking email - we send our own Labs-specific email below
        }),
      })
    } catch (calendarError) {
      console.error('Error adding to calendar:', calendarError)
      // Continue even if calendar fails
    }

    // Generate time-gated meeting link for online meetings
    let timeGatedLink: string | null = null
    if (meetingType === 'online' && meetLink) {
      // Create a time-gated link that redirects through an access control endpoint
      timeGatedLink = `${BASE_URL}/labs/showcase-meet/${bookingId}`
    }

    // Send confirmation emails
    // Use slotDateTime which is already in the correct timezone (Nairobi/EAT = UTC+3)
    // Parse the date components to ensure correct formatting
    const meetingDate = new Date(slotDateTime)
    
    // Format date using the actual booked date (in Nairobi timezone)
    const formattedDate = meetingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Africa/Nairobi', // Ensure we use Nairobi timezone
    })
    
    // Format time using the actual booked time (in Nairobi timezone)
    const formattedTime = meetingDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Africa/Nairobi', // Ensure we use Nairobi timezone
    })
    
    // Format time in client's timezone if available
    // Use the timezone from the booking object (which was set from the request body)
    const bookingClientTimezone = showcaseBooking.clientTimezone || 'Africa/Nairobi'
    const bookingClientCountry = showcaseBooking.clientCountry || 'Unknown'
    const formattedClientTime = (bookingClientTimezone && bookingClientTimezone !== 'Africa/Nairobi')
      ? meetingDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: bookingClientTimezone,
        })
      : formattedTime

    // Generate Google Calendar link
    // slotDateTime is in ISO format with timezone (+03:00 for Nairobi), so we can use it directly
    const meetingStart = new Date(slotDateTime)
    const meetingEnd = new Date(meetingStart.getTime() + 60 * 60 * 1000) // Add 1 hour for meeting duration
    
    // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ in UTC)
    // slotDateTime is already in ISO format with +03:00 timezone
    // We need to convert it to UTC for Google Calendar
    const formatGoogleCalendarDate = (date: Date): string => {
      // date is already a Date object created from slotDateTime (which has +03:00)
      // When we create a Date from an ISO string with timezone, JavaScript automatically converts to UTC
      // So date.getUTC* methods will give us the correct UTC time
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      const seconds = String(date.getUTCSeconds()).padStart(2, '0')
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
    }
    
    const startDateStr = formatGoogleCalendarDate(meetingStart)
    const endDateStr = formatGoogleCalendarDate(meetingEnd)
    
    // Generate iCal calendar file for email attachment
    const formatICSDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
    
    const icsStartDate = formatICSDate(meetingStart)
    const icsEndDate = formatICSDate(meetingEnd)
    
    const icsLocation = meetingType === 'online' 
      ? 'Online Meeting'
      : 'LashDiary Studio, Nairobi, Kenya'
    
    const icsDescription = `Showcase Meeting for ${project.businessName}

During this meeting, we'll cover:
• Walkthrough of your website
• Workflows and how to use the system
• Answer any questions you may have

${meetingType === 'online' && timeGatedLink ? `Meeting Link: ${timeGatedLink}\n\nNote: This link will only work during your scheduled time slot.` : ''}

If you need to reschedule, please contact us at hello@lashdiary.co.ke`
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LashDiary Labs//Showcase Booking//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:showcase-${bookingId}@lashdiary.co.ke
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${icsStartDate}
DTEND:${icsEndDate}
SUMMARY:Showcase Meeting - ${project.businessName}
DESCRIPTION:${icsDescription.replace(/\n/g, '\\n')}
LOCATION:${icsLocation}
ORGANIZER;CN=LashDiary Labs:mailto:${BUSINESS_NOTIFICATION_EMAIL}
ATTENDEE;CN=${clientName};RSVP=TRUE:mailto:${clientEmail}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: Showcase Meeting in 15 minutes
END:VALARM
END:VEVENT
END:VCALENDAR`
    
    // Create event details for Google Calendar link
    const eventTitle = encodeURIComponent(`Showcase Meeting - ${project.businessName}`)
    const eventLocation = meetingType === 'online' 
      ? (timeGatedLink ? encodeURIComponent(`Online Meeting: ${timeGatedLink}`) : encodeURIComponent('Online Meeting'))
      : encodeURIComponent('LashDiary Studio, Nairobi, Kenya')
    
    const eventDetails = encodeURIComponent(`Showcase Meeting for ${project.businessName}

During this meeting, we'll cover:
• Walkthrough of your website
• Workflows and how to use the system
• Answer any questions you may have

${meetingType === 'online' && timeGatedLink ? `Meeting Link: ${timeGatedLink}\n\nNote: This link will only work during your scheduled time slot.` : ''}

If you need to reschedule, please contact us at hello@lashdiary.co.ke`)
    
    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startDateStr}/${endDateStr}&details=${eventDetails}&location=${eventLocation}`

    // Client confirmation email
    const clientEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #FDF9F4;">
          <div style="background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #7C4B31; margin-top: 0;">Showcase Meeting Confirmed!</h1>
            
            <p>Hello ${clientName},</p>
            
            <p>Your showcase meeting has been successfully scheduled!</p>
            
            <div style="background: #F3E6DC; border-radius: 6px; padding: 20px; margin: 24px 0;">
              <h2 style="color: #7C4B31; margin-top: 0;">Meeting Details</h2>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${formattedTime}
                ${bookingClientTimezone && bookingClientCountry && bookingClientTimezone !== 'Africa/Nairobi' ? `
                  <br>
                  <span style="font-size: 13px; color: #6B4A3B; font-weight: normal; display: block; margin-top: 4px;">
                    Your local time: ${formattedClientTime} (${bookingClientTimezone.replace(/_/g, ' ')})
                    <br>
                    Nairobi time: ${formattedTime} (Africa/Nairobi)
                  </span>
                ` : ''}
              </p>
              <p><strong>Type:</strong> ${meetingType === 'online' ? 'Online Meeting' : 'Physical Meeting'}</p>
              ${meetingType === 'physical' ? '<p><strong>Location:</strong> LashDiary Studio, Nairobi, Kenya</p>' : (timeGatedLink ? `<p><strong>Location:</strong> Online Meeting</p>
              <div style="background: #E3F2FD; border-radius: 6px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0; color: #1565C0; font-weight: 600; font-size: 14px;">Your Secure Meeting Link:</p>
                <p style="margin: 0 0 12px 0; font-size: 13px; color: #424242;">
                  <a href="${timeGatedLink}" style="color: #1976D2; text-decoration: underline; word-break: break-all;">${timeGatedLink}</a>
                </p>
                <p style="margin: 0; font-size: 12px; color: #616161;">
                  <strong>Security:</strong> This link will only work during your scheduled time slot.
                  ${bookingClientTimezone && bookingClientCountry && bookingClientTimezone !== 'Africa/Nairobi' ? `
                    <br><br>
                    <strong>Your local time:</strong> ${formattedClientTime} on ${formattedDate} (${bookingClientTimezone.replace(/_/g, ' ')})
                    <br>
                    <strong>Nairobi time:</strong> ${formattedTime} on ${formattedDate} (Africa/Nairobi)
                    <br><br>
                    <em style="color: #d32f2f;">⚠️ Important: The meeting link will activate based on Nairobi time (Africa/Nairobi). Please join at your scheduled local time, which corresponds to the Nairobi time shown above.</em>
                  ` : `(${formattedTime} on ${formattedDate})`}
                  This ensures your privacy and prevents unauthorized access.
                </p>
              </div>` : '<p><strong>Location:</strong> Online (meeting link will be sent separately)</p>')}
            </div>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background-color: #4285F4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-bottom: 12px;">
                Add to Google Calendar
              </a>
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #666;">
                <strong>📎 Add to Calendar:</strong> We've attached a calendar event file (.ics) to this email. You can download it and add it to your calendar to ensure you don't miss the meeting.
              </p>
            </div>
            
            <p>During this meeting, we'll cover:</p>
            <ul>
              <li>Walkthrough of your website</li>
              <li>Workflows and how to use the system</li>
              <li>Answer any questions you may have</li>
            </ul>
            
            <p style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E0E0E0; font-size: 14px; color: #666;">
              If you need to reschedule, please contact us at hello@lashdiary.co.ke
            </p>
            
            <p style="margin-top: 16px; font-size: 14px; color: #666;">
              Best regards,<br>
              The LashDiary Labs Team
            </p>
          </div>
        </body>
      </html>
    `

    await sendEmailViaZoho({
      to: clientEmail,
      subject: `Showcase Meeting Confirmed - ${formattedDate} at ${formattedTime}`,
      html: clientEmailHtml,
      attachments: [
        {
          filename: 'showcase-meeting.ics',
          content: icsContent,
          contentType: 'text/calendar; charset=UTF-8; method=REQUEST',
        },
      ],
    })

    // Admin notification email
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #FDF9F4;">
          <div style="background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #7C4B31; margin-top: 0;">New Showcase Meeting Booked</h1>
            
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Business:</strong> ${project.businessName}</p>
            <p><strong>Email:</strong> ${clientEmail}</p>
            <p><strong>Phone:</strong> ${clientPhone || project.phone || 'N/A'}</p>
            
            <div style="background: #F3E6DC; border-radius: 6px; padding: 20px; margin: 24px 0;">
              <h2 style="color: #7C4B31; margin-top: 0;">Meeting Details</h2>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${formattedTime}</p>
              <p><strong>Type:</strong> ${meetingType === 'online' ? 'Online Meeting' : 'Physical Meeting'}</p>
            </div>
            
            <p style="margin-top: 16px; font-size: 14px; color: #666;">
              — LashDiary System
            </p>
          </div>
        </body>
      </html>
    `

    await sendEmailViaZoho({
      to: BUSINESS_NOTIFICATION_EMAIL,
      subject: `New Showcase Meeting: ${clientName} - ${project.businessName}`,
      html: adminEmailHtml,
    })

    return NextResponse.json({
      success: true,
      bookingId,
      message: 'Showcase meeting booked successfully',
    })
  } catch (error: any) {
    console.error('Error booking showcase meeting:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to book showcase meeting' },
      { status: 500 }
    )
  }
}

