import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { Resend } from 'resend'

const OWNER_EMAIL = process.env.CALENDAR_EMAIL || 'catherinenkuria@gmail.com'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    
    const body = await request.json()
    const { bookingId, email, name } = body

    if (!bookingId || !email || !name) {
      return NextResponse.json(
        { error: 'Booking ID, email, and name are required' },
        { status: 400 }
      )
    }

    // Update booking to mark testimonial as requested
    const bookingsData = readDataFile<{ bookings: any[] }>('bookings.json')
    const bookings = bookingsData.bookings || []
    const bookingIndex = bookings.findIndex(b => b.id === bookingId)
    
    if (bookingIndex !== -1) {
      bookings[bookingIndex].testimonialRequested = true
      bookings[bookingIndex].testimonialRequestedAt = new Date().toISOString()
      writeDataFile('bookings.json', { bookings })
    }

    // Send email
    if (!resend) {
      console.warn('Resend not configured, cannot send testimonial request email')
      return NextResponse.json({
        success: false,
        error: 'Email service not configured',
      })
    }

    const testimonialUrl = `${BASE_URL}/testimonials?email=${encodeURIComponent(email)}`
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Your Experience - LashDiary</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F9D0DE;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9D0DE; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="background: #F9D0DE; padding: 40px 30px; text-align: center; border-bottom: 2px solid #733D26;">
              <h1 style="color: #733D26; margin: 0; font-size: 32px; font-weight: bold;">LashDiary</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #733D26; margin: 0 0 20px 0; font-size: 24px;">Hi ${name}!</h2>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for getting your lashes done by LashDiary! We hope you're absolutely loving your new look and feeling fabulous!
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your experience means the world to us, and we'd be so grateful if you could take a moment to share your feedback. Whether it's a few kind words, a photo of your beautiful lashes, or both - every testimonial helps us grow and helps others discover the LashDiary difference!
              </p>
              <div style="background-color: #FFF0F7; border: 2px solid #733D26; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <h3 style="color: #733D26; margin: 0 0 15px 0; font-size: 18px;">Share Your Experience!</h3>
                <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                  You can share:
                </p>
                <ul style="color: #333333; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0; text-align: left; display: inline-block;">
                  <li>Your testimonial (text only)</li>
                  <li>A photo of your lashes</li>
                  <li>Or both - it's up to you!</li>
                </ul>
                <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                  Your feedback helps us improve and helps others discover LashDiary. We truly appreciate you!
                </p>
                <a href="${testimonialUrl}" 
                   style="display: inline-block; background-color: #733D26; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; margin: 10px 0;">
                  Leave a Testimonial
                </a>
              </div>
              <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Thank you for choosing LashDiary! We can't wait to see you again for your next appointment.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F9D0DE; padding: 30px; text-align: center; border-top: 2px solid #733D26;">
              <p style="color: #733D26; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">With love and gratitude,</p>
              <p style="color: #733D26; font-size: 16px; font-weight: bold; margin: 0;">The LashDiary Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    try {
      await resend.emails.send({
        from: `LashDiary <${FROM_EMAIL}>`,
        to: email,
        subject: 'Share Your LashDiary Experience!',
        html: emailHtml,
      })

      return NextResponse.json({
        success: true,
        message: 'Testimonial request email sent successfully',
      })
    } catch (emailError: any) {
      console.error('Error sending testimonial request email:', emailError)
      return NextResponse.json({
        success: false,
        error: 'Failed to send email',
        details: emailError.message,
      }, { status: 500 })
    }
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error sending testimonial request:', error)
    return NextResponse.json(
      { error: 'Failed to send testimonial request' },
      { status: 500 }
    )
  }
}

