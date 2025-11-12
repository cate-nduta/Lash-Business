import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { google } from 'googleapis'
import { Resend } from 'resend'
import { sendEmailNotification } from '../../booking/email/utils'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { updateFullyBookedState } from '@/lib/availability-utils'
import { getSalonCommissionSettings } from '@/lib/discount-utils'
const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'
const CALENDAR_EMAIL = process.env.GOOGLE_CALENDAR_EMAIL || 'hello@lashdiary.co.ke'
const STUDIO_LOCATION = process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || BUSINESS_NOTIFICATION_EMAIL || 'onboarding@resend.dev'
const OWNER_NOTIFICATION_EMAIL = BUSINESS_NOTIFICATION_EMAIL
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

const CLIENT_MANAGE_WINDOW_HOURS = Math.max(Number(process.env.CLIENT_MANAGE_WINDOW_HOURS || 72) || 72, 1)

const parseDateOnly = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null
  const parsed = new Date(`${value}T00:00:00+03:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const isWithinBookingWindow = (dateStr: string, bookingWindow?: any) => {
  if (!bookingWindow?.current) return true
  const target = parseDateOnly(dateStr)
  if (!target) return false
  const start = parseDateOnly(bookingWindow.current.startDate)
  const end = parseDateOnly(bookingWindow.current.endDate)
  if (start && target < start) return false
  if (end && target > end) return false
  return true
}

// Initialize Google Calendar API with write access
function getCalendarClient() {
  // Check if credentials are available
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
    throw new Error('Google Calendar API credentials are not configured. Please set up your .env.local file with GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_PROJECT_ID.')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })

  return google.calendar({ version: 'v3', auth })
}

function formatFriendlyDate(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

async function sendFullyBookedEmail(dateStr: string) {
  if (!resend) return
  try {
    const formattedDate = formatFriendlyDate(dateStr)
    await resend.emails.send({
      from: `LashDiary Alerts <${FROM_EMAIL}>`,
      to: OWNER_NOTIFICATION_EMAIL,
      subject: `Fully booked date: ${formattedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #FFF8FB; color: #2F1A16;">
          <h2 style="margin-top: 0; color: #733D26;">${formattedDate} is fully booked</h2>
          <p>All client slots for ${formattedDate} have been taken.</p>
          <p>You can reopen the day at any time from your admin bookings calendar.</p>
          <p style="margin-top: 24px;">— LashDiary System</p>
        </div>
      `,
    })
  } catch (error) {
    console.error('Failed to send fully booked email notification:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      timeSlot,
      service,
      date,
      location,
      notes,
      isFirstTimeClient,
      originalPrice,
      discount,
      finalPrice,
      deposit,
      mpesaCheckoutRequestID,
      promoCode,
      promoCodeType,
      salonReferral,
      clientPhoto,
    } = body
    const bookingLocation = location || STUDIO_LOCATION

    // Validate required fields
    if (!name || !email || !phone || !timeSlot) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Try to get calendar client, but handle gracefully if credentials aren't set up
    let calendar
    let calendarConfigured = true
    try {
      calendar = getCalendarClient()
    } catch (authError: any) {
      calendarConfigured = false
      // Continue without calendar - we'll send email notification instead
      console.warn('Google Calendar not configured, using email fallback:', authError.message)
    }
    // Use timeSlot which should already be in ISO format with timezone
    const startTime = new Date(timeSlot)
    if (isNaN(startTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid time slot format' },
        { status: 400 }
      )
    }
    const appointmentDateStr =
      (typeof date === 'string' && date.trim().length > 0) ? date : timeSlot.split('T')[0]
    if (!appointmentDateStr) {
      return NextResponse.json(
        { error: 'Missing booking date' },
        { status: 400 },
      )
    }

    const availability = await readDataFile<{ bookingWindow?: any }>('availability.json', {})
    if (!isWithinBookingWindow(appointmentDateStr, availability.bookingWindow)) {
      return NextResponse.json(
        { error: 'Bookings for this date are not open yet. Please choose another date.' },
        { status: 400 },
      )
    }

    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + 2) // 2-hour appointment default

    let eventId = null

    // Try to create calendar event if configured
    if (calendar && calendarConfigured) {
      try {
        // Create calendar event
        const event = {
          summary: `Lash Appointment - ${name}`,
          description: `
            Client: ${name}
            Email: ${email}
            Phone: ${phone}
            Service: ${service || 'Lash Service'}
            Location: ${bookingLocation}
            ${notes ? `Special Notes: ${notes}` : ''}
            Deposit: KSH ${deposit || 0}
            ${mpesaCheckoutRequestID ? `M-Pesa Checkout ID: ${mpesaCheckoutRequestID}` : ''}
          `,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'Africa/Nairobi',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'Africa/Nairobi',
          },
          attendees: [
            { email: CALENDAR_EMAIL },
            { email: email },
          ],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 60 }, // 1 hour before
            ],
          },
        }

        const response = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: event,
          sendUpdates: 'all', // Send email notifications
        })

        eventId = response.data.id
      } catch (calendarError: any) {
        console.error('Error creating calendar event:', calendarError)
        // Continue to send email notification even if calendar fails
      }
    }

    const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const manageToken = randomBytes(24).toString('hex')
    const policyWindowHours = CLIENT_MANAGE_WINDOW_HOURS
    const salonCommissionSettings = await getSalonCommissionSettings()
    const cancellationCutoff = new Date(startTime.getTime() - policyWindowHours * 60 * 60 * 1000)

    // Send email notifications via Resend
    let emailSent = false
    let emailError = null
    let emailStatus = 'skipped'
    try {
      const emailResult = await sendEmailNotification({
        name,
        email,
        phone,
        service: service || '',
        date,
        timeSlot,
        location: bookingLocation,
        isFirstTimeClient: isFirstTimeClient === true,
        originalPrice: originalPrice || 0,
        discount: discount || 0,
        finalPrice: finalPrice || originalPrice || 0,
        deposit: deposit || 0,
        bookingId,
        manageToken,
        policyWindowHours,
        notes: typeof notes === 'string' ? notes : undefined,
      })
      emailSent = emailResult.success === true && emailResult.ownerEmailSent === true
      emailStatus = emailResult.status || (emailSent ? 'sent' : 'issue')
      if (emailSent) {
        console.log('Email notifications status:', {
          ownerEmailSent: emailResult.ownerEmailSent,
          ownerEmailId: emailResult.ownerEmailId,
          customerEmailSent: emailResult.customerEmailSent,
          customerEmailId: emailResult.customerEmailId,
          customerEmailError: emailResult.customerEmailError,
        })
        
        if (!emailResult.customerEmailSent) {
          console.warn('⚠️ Customer email was not sent!')
          if (emailResult.customerEmailError) {
            console.error('Customer email error:', emailResult.customerEmailError)
          }
        }
      } else {
        console.warn('Email notifications not sent:', emailResult.error)
        emailError = emailResult.error
        emailStatus = emailResult.status || 'issue'
      }
    } catch (emailErr: any) {
      console.error('Error sending email notifications:', emailErr)
      emailError = emailErr.message || 'Email service error'
      emailStatus = 'error'
      // Don't fail the booking if email fails
    }

    // Save booking to bookings.json
    try {
      const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
      const bookings = bookingsData.bookings || []
      const hasDeposit = (deposit || 0) > 0
      const createdAt = new Date().toISOString()
      const originalServicePrice = Number(originalPrice || finalPrice || 0)
      const salonCommissionTotal = Math.round(
        originalServicePrice * (salonCommissionSettings.totalPercentage / 100),
      )
      const salonEarlyAmount = 0
      const salonFinalAmount = salonCommissionTotal

      const newBooking = {
        id: bookingId,
        name,
        email,
        phone,
        service: service || '',
        date,
        timeSlot,
        location: bookingLocation,
        notes: notes || '',
        originalPrice: originalPrice || 0,
        discount: discount || 0,
        finalPrice: finalPrice || originalPrice || 0,
        deposit: deposit || 0,
        discountType: body.discountType || null,
        promoCode: promoCode || null,
        referralType: promoCodeType || null,
        salonReferral: salonReferral || null,
        mpesaCheckoutRequestID: mpesaCheckoutRequestID || null,
        clientPhoto: clientPhoto?.url
          ? {
              url: clientPhoto.url.trim(),
              filename:
                typeof clientPhoto.filename === 'string' && clientPhoto.filename.trim().length > 0
                  ? clientPhoto.filename.trim()
                  : null,
              originalName:
                typeof clientPhoto.originalName === 'string' && clientPhoto.originalName.trim().length > 0
                  ? clientPhoto.originalName.trim()
                  : null,
              mimeType:
                typeof clientPhoto.mimeType === 'string' && clientPhoto.mimeType.trim().length > 0
                  ? clientPhoto.mimeType.trim()
                  : null,
              size: typeof clientPhoto.size === 'number' ? clientPhoto.size : null,
            }
          : null,
        createdAt,
        testimonialRequested: false,
        testimonialRequestedAt: null,
        status: 'confirmed',
        calendarEventId: eventId || null,
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
        refundStatus: hasDeposit ? 'not_applicable' : 'not_required',
        refundAmount: 0,
        refundNotes: null,
        rescheduledAt: null,
        rescheduledBy: null,
        rescheduleHistory: [],
        manageToken,
        manageTokenGeneratedAt: createdAt,
        manageTokenLastUsedAt: null,
        cancellationWindowHours: policyWindowHours,
        cancellationCutoffAt: cancellationCutoff.toISOString(),
        lastClientManageActionAt: null,
        clientManageDisabled: false,
        salonReferralDetails:
          body.isSalonReferral && body.promoCodeData
            ? {
                code: body.promoCodeData.code,
                salonEmail: body.promoCodeData.salonEmail,
                salonName: body.promoCodeData.salonName,
                clientDiscountPercent: body.promoCodeData.clientDiscountPercent,
                salonCommissionPercent: salonCommissionSettings.totalPercentage,
                commissionAmount: salonCommissionTotal,
                commissionTotalAmount: salonCommissionTotal,
                commissionEarlyPercent: 0,
                commissionFinalPercent: salonCommissionSettings.totalPercentage,
                commissionEarlyAmount: salonEarlyAmount,
                commissionFinalAmount: salonFinalAmount,
                commissionEarlyStatus: 'pending',
                commissionFinalStatus: 'pending',
                commissionEarlyPaidAt: null,
                commissionFinalPaidAt: null,
                cancellationWindowHours: policyWindowHours,
                cancellationCutoffAt: cancellationCutoff.toISOString(),
                status: 'pending',
              }
            : null,
      }

      bookings.push(newBooking)

      await writeDataFile('bookings.json', { bookings })

      if (clientPhoto?.url) {
        try {
          const existingPhotos = await readDataFile<{ entries?: any[] }>('client-photos.json', { entries: [] })
          const photoEntries = Array.isArray(existingPhotos.entries) ? existingPhotos.entries : []
          const photoEntry = {
            id: `${bookingId}-photo`,
            bookingId,
            name,
            email,
            phone,
            service: service || '',
            appointmentDate: date,
            uploadedAt: createdAt,
            photoUrl: clientPhoto.url.trim(),
            filename:
              typeof clientPhoto.filename === 'string' && clientPhoto.filename.trim().length > 0
                ? clientPhoto.filename.trim()
                : null,
          }
          photoEntries.push(photoEntry)
          await writeDataFile('client-photos.json', { entries: photoEntries })
        } catch (photoError) {
          console.error('Failed to persist client photo entry:', photoError)
        }
      }

      try {
        await updateFullyBookedState(date, bookings, {
          onDayFullyBooked: sendFullyBookedEmail,
        })
      } catch (stateError) {
        console.error('Failed to update fully booked tracking:', stateError)
      }

      return NextResponse.json({
        success: true,
        bookingId,
        calendarEventId: eventId,
        emailSent,
        emailError,
        emailStatus,
        calendarConfigured,
      })
    } catch (fileError: any) {
      console.error('Error saving booking:', fileError)
      return NextResponse.json(
        { error: 'Booking could not be saved. Please try again.' },
        { status: 500 }
      )
    }

    // Return success if calendar event was created OR if we're using email fallback
    if (eventId || !calendarConfigured) {
      return NextResponse.json({
        success: true,
        eventId: eventId,
        emailSent: emailSent,
        emailError: emailError,
        emailStatus,
        message: calendarConfigured 
          ? 'Appointment booked successfully!'
          : 'Booking request received!',
        calendarConfigured: calendarConfigured,
      })
    }

    // If we get here, both calendar and email failed (unlikely)
    return NextResponse.json({
      success: true,
      message: 'Booking request received! We will contact you shortly to confirm.',
    })
  } catch (error: any) {
    console.error('Error creating booking:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    // Check if it's a conflict error
    if (error.code === 409) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please select another time.' },
        { status: 409 }
      )
    }

    // Check if it's an authentication error
    if (error.code === 401 || error.code === 403) {
      return NextResponse.json(
        { error: 'Calendar authentication failed. Please check your Google Calendar API setup.' },
        { status: 500 }
      )
    }

    // Provide more detailed error message
    const errorMessage = error.message || 'Unknown error occurred'
    return NextResponse.json(
      { 
        error: 'Failed to create booking. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

