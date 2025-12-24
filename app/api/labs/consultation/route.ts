import { NextRequest, NextResponse } from 'next/server'
import { writeDataFile, readDataFile } from '@/lib/data-utils'
import {
  sanitizeEmail,
  sanitizeOptionalText,
  sanitizePhone,
  sanitizeText,
  ValidationError,
} from '@/lib/input-validation'
import {
  getZohoTransporter,
  isZohoConfigured,
  BUSINESS_NOTIFICATION_EMAIL,
  FROM_EMAIL,
  EMAIL_FROM_NAME,
} from '@/lib/email/zoho-config'
import { formatCurrency, type Currency } from '@/lib/currency-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface ConsultationSubmission {
  businessName: string
  contactName: string
  email: string
  phone: string
  businessType: string
  isBusinessRegistered?: string
  serviceType: string
  currentWebsite: string
  hasWebsite: string
  monthlyClients: string
  currentBookingSystem: string
  currentPaymentSystem: string
  mainPainPoints: string
  budgetRange: string
  timeline: string
  preferredContact: string
  additionalDetails: string
  preferredDate: string
  preferredTime: string
  meetingType: 'online' | 'physical'
  interestedTier: string
  selectedTier?: string // Optional field for selected tier
  consultationPrice: number
  currency: string
  submittedAt: string
  source: string
  status?: 'pending' | 'pending_payment' | 'confirmed' | 'cancelled'
  paymentStatus?: 'pending' | 'pending_payment' | 'paid' | 'not_required'
  paymentOrderTrackingId?: string | null
  paymentMethod?: string | null
  paidAt?: string
  paymentTransactionId?: string
  consultationId?: string
  meetLink?: string // Store the actual Google Meet link
  outcome?: 'build-now' | 'fix-first' | 'don\'t-build' | 'not-interested' | 'follow-up' // Consultation outcome
  buildEmailSentAt?: string // When build email was sent
  invoiceSentAt?: string // When invoice was sent
  invoiceId?: string // Invoice ID if invoice was created
  timeGatedLink?: string // Time-gated meeting link
  // Physical meeting location fields
  meetingCountry?: string
  meetingCity?: string
  meetingBuilding?: string
  meetingStreet?: string
}

// Generate iCal calendar file
function generateCalendarEvent(data: ConsultationSubmission, meetLink?: string | null): string {
  const formatDateForICS = (dateStr: string, timeStr: string): Date => {
    const date = new Date(dateStr)
    let hour = 10 // Default to 10 AM
    
    if (timeStr === 'morning') {
      hour = 10 // 10 AM
    } else if (timeStr === 'afternoon') {
      hour = 14 // 2 PM
    } else if (timeStr === 'evening') {
      hour = 17 // 5 PM
    }
    
    date.setHours(hour, 0, 0, 0)
    return date
  }

  const startDate = formatDateForICS(data.preferredDate, data.preferredTime)
  const endDate = new Date(startDate)
  endDate.setHours(endDate.getHours() + 1) // 1 hour duration

  const formatICSDate = (date: Date): string => {
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

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LashDiary Labs//Consultation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${data.consultationId || `consult-${Date.now()}`}@lashdiarylabs.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:LashDiary Labs Consultation - ${data.businessName}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Consultation in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return icsContent
}

async function createGoogleCalendarEventWithMeet(data: ConsultationSubmission): Promise<string | null> {
  // NOTE: We're NOT generating unique Meet links anymore to prevent direct links in calendar
  // Instead, we use admin-configured Meet room with time-gated links
  // This function is kept for backward compatibility but returns null
  // The admin Meet room will be used as fallback in the consultation creation
  console.log('ℹ️ Skipping unique Meet link generation - using admin-configured room with time-gated links instead')
  return null
}

// Import sendConsultationEmail from separate utility file
import { sendConsultationEmail } from './email-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = [
      'businessName',
      'contactName',
      'email',
      'phone',
      'businessType',
      'serviceType',
      'mainPainPoints',
      'preferredDate',
      'preferredTime',
      'meetingType',
    ]

    for (const field of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && !body[field].trim())) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate pain points length
    if (body.mainPainPoints && body.mainPainPoints.trim().length < 50) {
      return NextResponse.json(
        { error: 'Pain points description must be at least 50 characters' },
        { status: 400 }
      )
    }

    // Check if specific date+time slot is already booked
    const consultationsData = await readDataFile<{ consultations: ConsultationSubmission[] }>('labs-consultations.json', { consultations: [] })
    const isSlotBooked = consultationsData.consultations.some(
      consultation => 
        consultation.preferredDate === body.preferredDate && 
        consultation.preferredTime === body.preferredTime &&
        consultation.status !== 'cancelled'
    )

    if (isSlotBooked) {
      return NextResponse.json(
        { error: 'This time slot is already booked. Please select another date or time.' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    let businessName: string
    let contactName: string
    let email: string
    let phone: string
    let businessType: string
    let serviceType: string
    let mainPainPoints: string

    try {
      businessName = sanitizeText(body.businessName, { fieldName: 'Business name', maxLength: 100 })
      contactName = sanitizeText(body.contactName, { fieldName: 'Contact name', maxLength: 100 })
      email = sanitizeEmail(body.email)
      phone = sanitizePhone(body.phone)
      businessType = sanitizeText(body.businessType, { fieldName: 'Business type', maxLength: 50 })
      serviceType = sanitizeText(body.serviceType, { fieldName: 'Service type', maxLength: 200 })
      mainPainPoints = sanitizeText(body.mainPainPoints, { fieldName: 'Main pain points', maxLength: 2000 })
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    // Sanitize optional fields
    const consultationId = `consult-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const consultationData: ConsultationSubmission = {
      businessName,
      contactName,
      email,
      phone,
      businessType,
      serviceType,
      mainPainPoints,
      currentWebsite: sanitizeOptionalText(body.currentWebsite, { fieldName: 'Current website', maxLength: 500, optional: true }) || '',
      hasWebsite: sanitizeOptionalText(body.hasWebsite, { fieldName: 'Has website', maxLength: 50, optional: true }) || '',
      monthlyClients: sanitizeOptionalText(body.monthlyClients, { fieldName: 'Monthly clients', maxLength: 50, optional: true }) || '',
      currentBookingSystem: sanitizeOptionalText(body.currentBookingSystem, { fieldName: 'Current booking system', maxLength: 100, optional: true }) || '',
      currentPaymentSystem: sanitizeOptionalText(body.currentPaymentSystem, { fieldName: 'Current payment system', maxLength: 100, optional: true }) || '',
      budgetRange: sanitizeOptionalText(body.budgetRange, { fieldName: 'Budget range', maxLength: 50, optional: true }) || '',
      timeline: sanitizeOptionalText(body.timeline, { fieldName: 'Timeline', maxLength: 50, optional: true }) || '',
      preferredContact: sanitizeOptionalText(body.preferredContact, { fieldName: 'Preferred contact', maxLength: 50, optional: true }) || 'email',
      additionalDetails: sanitizeOptionalText(body.additionalDetails, { fieldName: 'Additional details', maxLength: 1000, optional: true }) || '',
      preferredDate: sanitizeText(body.preferredDate, { fieldName: 'Preferred date', maxLength: 50 }),
      preferredTime: sanitizeText(body.preferredTime, { fieldName: 'Preferred time', maxLength: 50 }),
      meetingType: (body.meetingType === 'online' || body.meetingType === 'physical') ? body.meetingType : 'online',
      interestedTier: sanitizeOptionalText(body.interestedTier, { fieldName: 'Interested tier', maxLength: 50, optional: true }) || '',
      // Physical meeting location fields (only if meeting type is physical)
      meetingCountry: body.meetingType === 'physical' ? (sanitizeOptionalText(body.meetingCountry, { fieldName: 'Meeting country', maxLength: 100, optional: true }) || '') : '',
      meetingCity: body.meetingType === 'physical' ? (sanitizeOptionalText(body.meetingCity, { fieldName: 'Meeting city', maxLength: 100, optional: true }) || '') : '',
      meetingBuilding: body.meetingType === 'physical' ? (sanitizeOptionalText(body.meetingBuilding, { fieldName: 'Meeting building', maxLength: 200, optional: true }) || '') : '',
      meetingStreet: body.meetingType === 'physical' ? (sanitizeOptionalText(body.meetingStreet, { fieldName: 'Meeting street', maxLength: 200, optional: true }) || '') : '',
      consultationPrice: typeof body.consultationPrice === 'number' ? body.consultationPrice : 7000,
      currency: (body.currency === 'USD' || body.currency === 'KES') ? body.currency : 'KES',
      submittedAt: body.submittedAt || new Date().toISOString(),
      source: body.source || 'labs-consultation',
      consultationId,
      paymentStatus: body.paymentStatus || 'pending',
      paymentOrderTrackingId: body.paymentOrderTrackingId || null,
      paymentMethod: body.paymentMethod || null,
    }

    // Check if consultation is free (0 KSH) - if so, create immediately without payment
    const consultationPrice = consultationData.consultationPrice || 0
    const isFree = consultationPrice === 0

    // If NOT free and payment is required, store as pending consultation instead of creating immediately
    if (!isFree && (body.paymentStatus === 'pending_payment' || body.paymentMethod === 'paystack')) {
      // Store pending consultation data - will be created after payment confirmation
      const pendingConsultations = await readDataFile<Array<{
        consultationId: string
        consultationData: ConsultationSubmission
        createdAt: string
      }>>('pending-consultations.json', [])

      pendingConsultations.push({
        consultationId,
        consultationData: {
          ...consultationData,
          status: 'pending_payment',
        },
        createdAt: new Date().toISOString(),
      })

      await writeDataFile('pending-consultations.json', pendingConsultations)

      // Return success but indicate consultation is pending payment
      return NextResponse.json({
        success: true,
        consultationId,
        pendingPayment: true,
        message: 'Consultation will be created after payment confirmation',
      })
    }

    // For free consultations or legacy support, create immediately
    consultationData.status = isFree ? 'confirmed' : (body.paymentStatus === 'pending_payment' ? 'pending_payment' : 'confirmed')
    consultationData.paymentStatus = isFree ? 'not_required' : (body.paymentStatus || 'pending')

    // Only send email if payment is already completed (for rebooking or manual confirmations)
    // For new consultations with pending payment, email will be sent after IPN confirms payment
    const shouldSendEmail = consultationData.paymentStatus !== 'pending_payment'

    // Use admin-configured Meet room for all consultations (for online meetings)
    // This prevents direct Meet links from appearing in calendar events
    // The Meet room can be changed weekly in admin settings for security
    if (consultationData.meetingType === 'online') {
      try {
        const { readDataFile } = await import('@/lib/data-utils')
        const labsSettings = await readDataFile<{ googleMeetRoom?: string }>('labs-settings.json', {})
        // Priority: Admin settings first, then env variable as fallback
        const adminMeetRoom = labsSettings.googleMeetRoom || process.env.STATIC_GOOGLE_MEET_ROOM || process.env.GOOGLE_MEET_ROOM || null
        
        if (adminMeetRoom && adminMeetRoom.trim()) {
          consultationData.meetLink = adminMeetRoom.trim()
          console.log('✅ Using Meet room (admin-configured or env fallback)')
        } else {
          console.warn('❌ No Meet room configured. Please set Meet room in admin settings (/admin/labs).')
        }
      } catch (error) {
        console.warn('Error loading admin Meet room settings:', error)
        // Final fallback to environment variable if admin settings fail to load
        const envMeetRoom = process.env.STATIC_GOOGLE_MEET_ROOM || process.env.GOOGLE_MEET_ROOM || null
        if (envMeetRoom && envMeetRoom.trim()) {
          consultationData.meetLink = envMeetRoom.trim()
          console.log('✅ Using Meet room from environment variable (fallback)')
        } else {
          console.warn('❌ No Meet room available. Please configure in admin settings or environment variable.')
        }
      }
    }

    // Store consultation request in data file
    try {
      const consultationsData = await readDataFile<{ consultations: ConsultationSubmission[] }>('labs-consultations.json', { consultations: [] })
      consultationsData.consultations.push(consultationData)
      await writeDataFile('labs-consultations.json', consultationsData)
    } catch (error) {
      console.error('Error storing consultation data:', error)
      // Continue even if storage fails - email is more important
    }

    // Send email notification (with time-gated link) only if payment is not pending
    if (shouldSendEmail) {
    try {
      await sendConsultationEmail(consultationData)
    } catch (error) {
      console.error('Error sending consultation email:', error)
      // Still return success if email fails - data is stored
      }
    } else {
      console.log('📧 Email will be sent after payment is confirmed via IPN')
    }

    return NextResponse.json({
      success: true,
      message: 'Consultation request submitted successfully',
    })
  } catch (error: any) {
    console.error('Error processing consultation request:', error)
    return NextResponse.json(
      {
        error: 'Failed to process consultation request',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

