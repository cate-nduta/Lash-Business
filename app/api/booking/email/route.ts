import { NextRequest, NextResponse } from 'next/server'
import { sendEmailNotification } from './utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      service,
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
    } = body

    // Validate required fields
    if (!name || !email || !phone || !timeSlot || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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
