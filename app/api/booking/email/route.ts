import { NextRequest, NextResponse } from 'next/server'
import { sendEmailNotification } from './utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, service, date, timeSlot, location } = body

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
    })

    return NextResponse.json({
      ...result,
      message: result.success 
        ? 'Email notifications sent successfully' 
        : 'Email service not configured',
    })
  } catch (error: any) {
    console.error('Error sending email notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification', details: error.message },
      { status: 500 }
    )
  }
}
