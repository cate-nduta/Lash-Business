import { NextRequest, NextResponse } from 'next/server'
import { sendEmailNotification } from './utils'
import { readDataFile } from '@/lib/data-utils'
import {
  sanitizeEmail,
  sanitizeOptionalText,
  sanitizePhone,
  sanitizeText,
  ValidationError,
} from '@/lib/input-validation'

// CRITICAL: No caching for email endpoints - always use fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

const STUDIO_LOCATION = process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name: rawName,
      email: rawEmail,
      phone: rawPhone,
      service: rawService,
      date: rawDate,
      timeSlot: rawTimeSlot,
      location: rawLocation,
      originalPrice,
      discount,
      finalPrice,
      deposit,
      manageToken,
      bookingId,
      policyWindowHours,
      desiredLook: rawDesiredLook,
    } = body

    // Validate required fields
    if (!rawName || !rawEmail || !rawPhone || !rawTimeSlot) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch location from contact settings if not provided
    let locationInput = rawLocation
    if (!locationInput) {
      try {
        const contact = await readDataFile<{ location?: string | null }>('contact.json', {})
        locationInput = contact?.location || STUDIO_LOCATION
      } catch (error) {
        console.error('Error loading location from contact settings:', error)
        locationInput = STUDIO_LOCATION
      }
    }

    let name: string
    let email: string
    let phone: string
    let timeSlot: string
    let location: string
    let service: string
    let date: string
    let desiredLook: string

    try {
      name = sanitizeText(rawName, { fieldName: 'Name', maxLength: 80 })
      email = sanitizeEmail(rawEmail)
      phone = sanitizePhone(rawPhone)
      timeSlot = sanitizeText(rawTimeSlot, { fieldName: 'Time slot', maxLength: 80 })
      location = sanitizeText(locationInput, { fieldName: 'Location', maxLength: 160 })
      service = sanitizeOptionalText(rawService, { fieldName: 'Service', maxLength: 120, optional: true })
      date = sanitizeOptionalText(rawDate, { fieldName: 'Date', maxLength: 32, optional: true })
      desiredLook = sanitizeOptionalText(rawDesiredLook, { fieldName: 'Desired look', maxLength: 160, optional: true })
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    const desiredLookNormalized = desiredLook || 'Custom'
    const desiredLookStatus: 'recommended' | 'custom' = 'custom'

    // Send email notifications
    const result = await sendEmailNotification({
      name,
      email,
      phone,
      service: service || '',
      date,
      timeSlot,
      location,
      originalPrice,
      discount,
      finalPrice,
      deposit,
      manageToken,
      bookingId,
      policyWindowHours,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      desiredLook: desiredLookNormalized,
      desiredLookStatus,
    })

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          status: 'error',
          error: 'Email notification service did not return a response.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ...result,
      message: result.success
        ? 'Email notifications sent successfully'
        : result.error || 'Email service not configured',
    })
  } catch (error: any) {
    console.error('Error sending email notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification', details: error.message },
      { status: 500 }
    )
  }
}
