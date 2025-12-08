import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'
import { getCalendarClientWithWrite } from '@/lib/google-calendar-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { sendEmailNotification } from '../../booking/email/utils'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { updateFullyBookedState } from '@/lib/availability-utils'
import { getSalonCommissionSettings } from '@/lib/discount-utils'
import { redeemGiftCard } from '@/lib/gift-card-utils'
import {
  sanitizeEmail,
  sanitizeNotes,
  sanitizeOptionalText,
  sanitizePhone,
  sanitizeStringArray,
  sanitizeText,
  ValidationError,
} from '@/lib/input-validation'
import type { ClientData, ClientUsersData, ClientProfile, LashHistory } from '@/types/client'

const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'
const CALENDAR_EMAIL = process.env.GOOGLE_CALENDAR_EMAIL || 'hello@lashdiary.co.ke'
const STUDIO_LOCATION = process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'
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
const OWNER_NOTIFICATION_EMAIL = BUSINESS_NOTIFICATION_EMAIL

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

const CLIENT_MANAGE_WINDOW_HOURS = Math.max(Number(process.env.CLIENT_MANAGE_WINDOW_HOURS || 72) || 72, 1)

const parseDateOnly = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null
  const parsed = new Date(`${value}T00:00:00+03:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const INFILL_MAX_DAYS = 14
const isFillServiceName = (value?: string | null) => {
  if (!value || typeof value !== 'string') return false
  const normalized = value.toLowerCase()
  return normalized.includes('fill')
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

// Create or update client account when booking is made
async function createOrUpdateClientAccount(data: {
  email: string
  name: string
  phone: string
  bookingId: string
  appointmentDate: string
  service: string
  serviceType: 'full-set' | 'refill' | 'removal' | 'other'
}): Promise<{ isNewUser: boolean }> {
  const normalizedEmail = data.email.toLowerCase().trim()
  const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
  
  // Find existing user by email
  let user = usersData.users.find(u => u.email.toLowerCase().trim() === normalizedEmail)
  let isNewUser = false
  
  if (!user) {
    isNewUser = true
    // Create new user account (without password - they can set it later)
    const userId = randomBytes(16).toString('hex')
    const now = new Date().toISOString()
    
    // Create account without verification (bookings don't require verification)
    user = {
      id: userId,
      email: normalizedEmail,
      name: data.name,
      phone: data.phone,
      passwordHash: '', // Empty - user will set password when they register
      createdAt: now,
      isActive: true,
      emailVerified: false, // Not verified yet - they'll verify when they register
    }
    
    usersData.users.push(user)
    await writeDataFile('users.json', usersData)
    
    // Create client data file
    const clientData: ClientData = {
      profile: user,
      lashHistory: [],
      preferences: {
        preferredCurl: null,
        lengthRange: null,
        densityLevel: null,
        eyeShape: null,
        mappingStyle: null,
        signatureLook: null,
      },
      allergies: {
        hasReaction: false,
      },
      aftercare: {},
      lashMaps: [],
      retentionCycles: [],
    }
    
    const clientDataFile = `client-${userId}.json`
    await writeDataFile(clientDataFile, clientData)
  } else {
    // Update existing user info if needed
    if (user.name !== data.name) user.name = data.name
    if (user.phone !== data.phone) user.phone = data.phone
    await writeDataFile('users.json', usersData)
  }
  
  // Add appointment to lash history
  const clientDataFile = `client-${user.id}.json`
  const clientData = await readDataFile<ClientData>(clientDataFile, undefined)
  
  if (clientData) {
    const lashHistoryEntry: LashHistory = {
      appointmentId: data.bookingId,
      date: data.appointmentDate,
      service: data.service,
      serviceType: data.serviceType,
      lashTech: 'Lash Technician',
    }
    
    clientData.lashHistory.push(lashHistoryEntry)
    
    // Update last appointment date
    const appointmentDate = new Date(data.appointmentDate)
    if (!clientData.lastAppointmentDate || appointmentDate > new Date(clientData.lastAppointmentDate)) {
      clientData.lastAppointmentDate = data.appointmentDate
    }
    
    await writeDataFile(clientDataFile, clientData)
  }
  
  return { isNewUser }
}

// getCalendarClientWithWrite is now imported from lib/google-calendar-client

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
  if (!zohoTransporter) return
  try {
    const formattedDate = formatFriendlyDate(dateStr)
    await zohoTransporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: OWNER_NOTIFICATION_EMAIL,
      subject: `Fully Booked Date Alert 🤎`,
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
      name: rawName,
      email: rawEmail,
      phone: rawPhone,
      timeSlot: rawTimeSlot,
      service: rawService,
      services: rawServices, // Array of service names (new)
      serviceDetails: rawServiceDetails, // Array of service details (new)
      date: rawDate,
      lastFullSetDate: rawLastFullSetDate,
      location: rawLocation,
      notes: rawNotes,
      appointmentPreference: rawAppointmentPreference,
      isFirstTimeClient,
      originalPrice,
      discount,
      finalPrice,
      deposit,
      paymentType, // 'deposit' or 'full'
      mpesaCheckoutRequestID: rawMpesaCheckoutRequestID,
      promoCode: rawPromoCode,
      promoCodeType,
      salonReferral: rawSalonReferral,
      giftCardCode: rawGiftCardCode,
      desiredLook: rawDesiredLook,
    } = body
    
    // Fetch location from contact settings if not provided
    let bookingLocationInput = rawLocation
    if (!bookingLocationInput) {
      try {
        const contact = await readDataFile<{ location?: string | null }>('contact.json', {})
        bookingLocationInput = contact?.location || STUDIO_LOCATION
      } catch (error) {
        console.error('Error loading location from contact settings:', error)
        bookingLocationInput = STUDIO_LOCATION
      }
    }

    // Validate required fields
    if (!rawName || !rawEmail || !rawPhone || !rawTimeSlot) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let name: string
    let email: string
    let phone: string
    let timeSlot: string
    let date: string
    let service: string
    let services: string[]
    let bookingLocation: string
    let notes: string
    let appointmentPreference: string
    let promoCode: string
    let salonReferral: string
    let desiredLook: string
    let mpesaCheckoutRequestID: string
    let lastFullSetDate: string
    let serviceDetails: Array<{ name?: string; categoryName?: string; duration?: number }>

    try {
      name = sanitizeText(rawName, { fieldName: 'Name', maxLength: 80 })
      email = sanitizeEmail(rawEmail)
      phone = sanitizePhone(rawPhone)
      timeSlot = sanitizeText(rawTimeSlot, { fieldName: 'Time slot', maxLength: 80 })
      date = sanitizeOptionalText(rawDate, { fieldName: 'Booking date', maxLength: 32, optional: true })
      service = sanitizeOptionalText(rawService, { fieldName: 'Service', maxLength: 120, optional: true })
      services = sanitizeStringArray(rawServices, { fieldName: 'Service', maxLength: 120, maxItems: 8 })
      bookingLocation =
        sanitizeOptionalText(bookingLocationInput, { fieldName: 'Location', maxLength: 160, optional: true }) ||
        STUDIO_LOCATION
      notes = sanitizeNotes(rawNotes, 'Notes', 1500)
      appointmentPreference = sanitizeOptionalText(rawAppointmentPreference, {
        fieldName: 'Appointment preference',
        maxLength: 100,
        optional: true,
      })
      promoCode = sanitizeOptionalText(rawPromoCode, {
        fieldName: 'Promo code',
        maxLength: 40,
        optional: true,
        toLowerCase: true,
      })
      salonReferral = sanitizeOptionalText(rawSalonReferral, { fieldName: 'Salon referral', maxLength: 120, optional: true })
      desiredLook = sanitizeOptionalText(rawDesiredLook, { fieldName: 'Desired look', maxLength: 160, optional: true })
      mpesaCheckoutRequestID = sanitizeOptionalText(rawMpesaCheckoutRequestID, {
        fieldName: 'M-Pesa checkout ID',
        maxLength: 80,
        optional: true,
        allowSymbols: true,
      })
      lastFullSetDate = sanitizeOptionalText(rawLastFullSetDate, {
        fieldName: 'Last full set date',
        maxLength: 32,
        optional: true,
      })
      serviceDetails = Array.isArray(rawServiceDetails)
        ? rawServiceDetails.slice(0, 8).map((detail, index) => ({
            ...detail,
            name: sanitizeOptionalText(detail?.name, {
              fieldName: `Service ${index + 1} name`,
              maxLength: 120,
              optional: true,
            }),
            categoryName: sanitizeOptionalText(detail?.categoryName, {
              fieldName: `Service ${index + 1} category`,
              maxLength: 120,
              optional: true,
            }),
            duration: typeof detail?.duration === 'number' && detail.duration > 0 ? detail.duration : 0,
          }))
        : []
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    const normalizeStyleName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const desiredLookNormalized = desiredLook || 'Custom'
    const desiredLookMatchesRecommendation = desiredLookNormalized.toLowerCase() === 'recommended'
    const desiredLookLabel = desiredLookNormalized
      .split('-')
      .join(' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())

    const lashMapStatus = 'custom'
    const lashMapStatusMessage = 'Map will be decided at appointment.'

    // Try to get calendar client, but handle gracefully if credentials aren't set up
    let calendar
    let calendarConfigured = true
    try {
      calendar = await getCalendarClientWithWrite()
      if (!calendar) {
        throw new Error('Google Calendar API credentials are not configured.')
      }
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
    const appointmentDateStr = date ? date : timeSlot.split('T')[0]
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

    // Enforce 24-hour advance booking requirement
    const now = new Date()
    const hoursUntilAppointment = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    const MIN_ADVANCE_BOOKING_HOURS = 24
    
    if (hoursUntilAppointment < MIN_ADVANCE_BOOKING_HOURS) {
      return NextResponse.json(
        { 
          error: `All appointments must be booked at least ${MIN_ADVANCE_BOOKING_HOURS} hours in advance. Please select a later date and time.`,
          details: `The selected appointment time is only ${Math.round(hoursUntilAppointment * 10) / 10} hours away. Bookings must be made at least ${MIN_ADVANCE_BOOKING_HOURS} hours before the appointment time.`
        },
        { status: 400 },
      )
    }

    const normalizedServices: string[] = services
    let daysSinceLastFullSet: number | null = null
    const hasFillServiceSelected =
      normalizedServices.some((serviceName) => isFillServiceName(serviceName)) || isFillServiceName(service)

    if (hasFillServiceSelected) {
      if (!lastFullSetDate) {
        return NextResponse.json(
          { error: 'Please provide the date of your last full lash set to book an infill service.' },
          { status: 400 },
        )
      }
      const parsedLastFullSet = parseDateOnly(lastFullSetDate)
      const parsedAppointmentDate = parseDateOnly(appointmentDateStr)
      if (!parsedLastFullSet || !parsedAppointmentDate) {
        return NextResponse.json(
          { error: 'Invalid last full set date. Please pick a valid date to continue.' },
          { status: 400 },
        )
      }
      const diffDays = Math.max(
        0,
        Math.floor((parsedAppointmentDate.getTime() - parsedLastFullSet.getTime()) / (1000 * 60 * 60 * 24)),
      )
      daysSinceLastFullSet = diffDays
      if (diffDays > INFILL_MAX_DAYS) {
        return NextResponse.json(
          {
            error: `Fills are only available within ${INFILL_MAX_DAYS} days of your last full set. Please book a new full set so we can achieve the best retention.`,
          },
          { status: 400 },
        )
      }
    }

    // Calculate total duration from service details or use default
    let totalDuration = 2 // Default 2 hours
    if (Array.isArray(serviceDetails) && serviceDetails.length > 0) {
      totalDuration = Math.ceil(serviceDetails.reduce((sum, s) => sum + (s.duration || 0), 0) / 60) // Convert minutes to hours
    } else if (service) {
      // Fallback: try to estimate from service name (legacy support)
      totalDuration = 2
    }
    
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + totalDuration)

    let eventId = null

    // Try to create calendar event if configured
    if (calendar && calendarConfigured) {
      try {
        // Create calendar event
        // Format service information
        const serviceInfo =
          normalizedServices.length > 0 ? normalizedServices.join(' + ') : service || 'Lash Service'
        
        const serviceDetailsText = Array.isArray(serviceDetails) && serviceDetails.length > 0
          ? `\nServices:\n${serviceDetails.map((s, idx) => `  ${idx + 1}. ${s.name} - ${s.duration} min - ${s.categoryName}`).join('\n')}`
          : ''
        const friendlyLastFullSet = lastFullSetDate ? formatFriendlyDate(lastFullSetDate) : null
        
        const event = {
          summary: `Lash Appointment - ${name}`,
          description: `
            Client: ${name}
            Email: ${email}
            Phone: ${phone}
            Service: ${serviceInfo}${serviceDetailsText}
            Desired lash look: ${desiredLookLabel}
            Lash Map Status: ${lashMapStatusMessage}
            Location: ${bookingLocation}
            ${
              friendlyLastFullSet
                ? `Last Full Set: ${friendlyLastFullSet}`
                : lastFullSetDate
                ? `Last Full Set: ${lastFullSetDate}`
                : ''
            }
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
    
    // Redeem gift card if provided
    let giftCardRedeemed = false
    let giftCardRemainingBalance = 0
    const giftCardCode = typeof rawGiftCardCode === 'string' && rawGiftCardCode.trim() ? rawGiftCardCode.trim() : null
    if (giftCardCode && deposit > 0) {
      try {
        const redeemResult = await redeemGiftCard(giftCardCode, deposit, bookingId, email)
        if (redeemResult.success) {
          giftCardRedeemed = true
          giftCardRemainingBalance = redeemResult.remainingBalance || 0
        }
      } catch (error) {
        console.error('Error redeeming gift card:', error)
        // Don't fail booking if gift card redemption fails
      }
    }

    // Send email notifications via Resend
    let emailSent = false
    let emailError = null
    let emailStatus = 'skipped'
    try {
      const emailResult = await sendEmailNotification({
        name,
        email,
        phone,
        service: normalizedServices.length > 0 ? normalizedServices.join(' + ') : service || '',
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
        appointmentPreference: appointmentPreference || undefined,
        desiredLook: desiredLookLabel,
        desiredLookStatus: lashMapStatus,
        isGiftCardBooking: !!giftCardCode,
      })
      if (!emailResult) {
        console.warn('Email notification service did not return a response.')
        emailSent = false
        emailError = 'Email service unavailable'
        emailStatus = 'error'
      } else {
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
        service: normalizedServices.length > 0 ? normalizedServices.join(' + ') : service || '',
        services: normalizedServices.length > 0 ? normalizedServices : service ? [service] : [],
        serviceDetails: Array.isArray(serviceDetails) ? serviceDetails : null,
        lastFullSetDate: typeof lastFullSetDate === 'string' ? lastFullSetDate : null,
        lastFullSetDaysSince: typeof daysSinceLastFullSet === 'number' ? daysSinceLastFullSet : null,
        date,
        timeSlot,
        location: bookingLocation,
        desiredLook: desiredLookLabel,
        desiredLookStatus: lashMapStatus,
        desiredLookStatusMessage: lashMapStatusMessage,
        desiredLookMatchesRecommendation,
        notes: notes || '',
        appointmentPreference: appointmentPreference || '',
        originalPrice: originalPrice || 0,
        discount: discount || 0,
        finalPrice: finalPrice || originalPrice || 0,
        deposit: deposit || 0,
        discountType: body.discountType || null,
        promoCode: promoCode || null,
        referralType: promoCodeType || null,
        salonReferral: salonReferral || null,
        giftCardCode: giftCardCode || null,
        giftCardRedeemed: giftCardRedeemed || false,
        giftCardRemainingBalance: giftCardRemainingBalance || 0,
        mpesaCheckoutRequestID: mpesaCheckoutRequestID || null,
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

      // Create or update client account (no verification required for bookings)
      let isNewUser = false
      try {
        const normalizedEmail = email.toLowerCase().trim()
        const clientAccountResult = await createOrUpdateClientAccount({
          email: normalizedEmail,
          name,
          phone,
          bookingId,
          appointmentDate: date,
          service: normalizedServices.length > 0 ? normalizedServices.join(' + ') : service || '',
          serviceType: hasFillServiceSelected ? 'refill' : 'full-set',
        })
        isNewUser = clientAccountResult.isNewUser
      } catch (clientError) {
        console.error('Error creating/updating client account:', clientError)
        // Don't fail booking if client account creation fails
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
        isNewUser,
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
        isNewUser: false, // This path shouldn't reach here for new bookings, but set default
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

