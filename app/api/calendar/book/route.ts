import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { sendEmailNotification } from '../../booking/email/utils'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'
const CALENDAR_EMAIL = process.env.GOOGLE_CALENDAR_EMAIL || 'catherinenkuria@gmail.com'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, timeSlot, service, date, location, isFirstTimeClient, originalPrice, discount, finalPrice, deposit, mpesaCheckoutRequestID } = body

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
            Location: ${location || 'Not specified'}
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

    // Send email notifications via Resend
    let emailSent = false
    let emailError = null
    try {
      const emailResult = await sendEmailNotification({
        name,
        email,
        phone,
        service: service || '',
        date,
        timeSlot,
        location: location || '',
        isFirstTimeClient: isFirstTimeClient === true,
        originalPrice: originalPrice || 0,
        discount: discount || 0,
        finalPrice: finalPrice || originalPrice || 0,
        deposit: deposit || 0,
      })
      emailSent = emailResult.success === true && emailResult.ownerEmailSent === true
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
      }
    } catch (emailErr: any) {
      console.error('Error sending email notifications:', emailErr)
      emailError = emailErr.message || 'Email service error'
      // Don't fail the booking if email fails
    }

    // Save booking to bookings.json
    try {
      const bookingsData = readDataFile<{ bookings: any[] }>('bookings.json')
      const bookings = bookingsData.bookings || []
      
      const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newBooking = {
        id: bookingId,
        name,
        email,
        phone,
        service: service || '',
        date,
        timeSlot,
        location: location || '',
        originalPrice: originalPrice || 0,
        discount: discount || 0,
        finalPrice: finalPrice || originalPrice || 0,
        deposit: deposit || 0,
        discountType: body.discountType || null,
        promoCode: body.promoCode || null,
        mpesaCheckoutRequestID: mpesaCheckoutRequestID || null,
        createdAt: new Date().toISOString(),
        testimonialRequested: false,
        testimonialRequestedAt: null,
      }
      
      bookings.push(newBooking)
      writeDataFile('bookings.json', { bookings })
    } catch (bookingError) {
      console.error('Error saving booking:', bookingError)
      // Don't fail the booking if saving to file fails
    }

    // Return success if calendar event was created OR if we're using email fallback
    if (eventId || !calendarConfigured) {
      return NextResponse.json({
        success: true,
        eventId: eventId,
        emailSent: emailSent,
        emailError: emailError,
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

