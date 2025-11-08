import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { Resend } from 'resend'
import { getBusinessSettings } from '@/lib/email-campaign-utils'

const OWNER_EMAIL = process.env.CALENDAR_EMAIL || 'catherinenkuria@gmail.com'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const body = await request.json()
    const { bookingId, email, name } = body

    if (!bookingId || !email || !name) {
      return NextResponse.json(
        { error: 'Booking ID, email, and name are required' },
        { status: 400 }
      )
    }

    // Update booking to mark testimonial as requested
    const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    const bookings = bookingsData.bookings || []
    const bookingIndex = bookings.findIndex(b => b.id === bookingId)
    
    if (bookingIndex !== -1) {
      bookings[bookingIndex].testimonialRequested = true
      bookings[bookingIndex].testimonialRequestedAt = new Date().toISOString()
      await writeDataFile('bookings.json', { bookings })
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
    const business = await getBusinessSettings()
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Your Experience - ${business.name || 'LashDiary'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #FDF7FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF7FA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 22px 55px rgba(115, 61, 38, 0.12); border: 1px solid #F6D7E5;">
          <tr>
            <td style="background: linear-gradient(135deg, #FAD4E6 0%, #FBE9EF 50%, #FFFFFF 100%); padding: 44px 32px; text-align: center;">
              <div style="font-size: 14px; letter-spacing: 0.24em; text-transform: uppercase; color: #9B5B72; font-weight: 600; margin-bottom: 12px;">
                ${business.description || 'Luxury Lash & Beauty Studio'}
              </div>
              <h1 style="color: #4F2C1D; margin: 0; font-size: 36px; font-weight: 800; letter-spacing: 0.04em;">
                ${business.name || 'LashDiary'}
              </h1>
              <p style="margin: 14px 0 0; font-size: 16px; color: #7B485C; line-height: 1.7;">
                Personalized lash artistry, delivered with love and elegance.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 36px 40px 32px 40px;">
                    <div style="
                      background-color: #FFF3F8;
                      border-radius: 22px;
                      padding: 32px 34px;
                      border: 1px solid rgba(154, 92, 114, 0.15);
                    ">
                      <h2 style="color: #4F2C1D; margin: 0 0 20px 0; font-size: 24px;">Hi ${name}!</h2>
                      <p style="color: #4F2C1D; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                        Thank you for getting your lashes done by ${business.name || 'LashDiary'}! We hope you're absolutely loving your new look and feeling fabulous!
                      </p>
                      <p style="color: #4F2C1D; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0;">
                        Your experience means the world to us, and we'd be so grateful if you could take a moment to share your feedback. Whether it's a few kind words, a photo of your beautiful lashes, or both - every testimonial helps us grow and helps others discover the ${business.name || 'LashDiary'} difference!
                      </p>
                      <div style="background-color: #FFF; border: 2px solid #F6D7E5; padding: 28px; border-radius: 16px; margin: 30px 0; text-align: center; box-shadow: 0 8px 20px rgba(154, 92, 114, 0.08);">
                        <h3 style="color: #4F2C1D; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">Share Your Experience!</h3>
                        <p style="color: #7B485C; font-size: 15px; line-height: 1.7; margin: 0 0 10px 0;">
                          You can share:
                        </p>
                        <ul style="color: #7B485C; font-size: 15px; line-height: 1.9; margin: 0 0 24px 0; text-align: left; display: inline-block; padding-left: 20px;">
                          <li>Your testimonial (text only)</li>
                          <li>A photo of your lashes</li>
                          <li>Or both - it's up to you!</li>
                        </ul>
                        <a href="${testimonialUrl}" 
                           style="
                             display: inline-block;
                             padding: 14px 32px;
                             background: linear-gradient(135deg, #F6A9C5 0%, #EE7AA7 100%);
                             color: #ffffff;
                             text-decoration: none;
                             font-weight: 600;
                             border-radius: 999px;
                             box-shadow: 0 12px 25px rgba(238, 122, 167, 0.3);
                             letter-spacing: 0.03em;
                             font-size: 15px;
                           ">
                          Leave a Testimonial
                        </a>
                      </div>
                      <p style="color: #7B485C; font-size: 15px; line-height: 1.7; margin: 30px 0 0 0;">
                        Your feedback helps us improve and helps others discover ${business.name || 'LashDiary'}. We truly appreciate you!
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
                <tr>
                  <td style="height: 1px; background-color: #F6D7E5;"></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 36px 40px;">
              <p style="font-size: 15px; color: #7B485C; margin: 0 0 10px 0; line-height: 1.7;">
                With love and gratitude,
              </p>
              <p style="font-size: 17px; color: #4F2C1D; font-weight: 700; margin: 0 0 20px 0;">
                The ${business.name || 'LashDiary'} Team
              </p>
              <a
                href="${BASE_URL}"
                style="
                  display: inline-block;
                  padding: 14px 26px;
                  background: linear-gradient(135deg, #F6A9C5 0%, #EE7AA7 100%);
                  color: #ffffff;
                  text-decoration: none;
                  font-weight: 600;
                  border-radius: 999px;
                  box-shadow: 0 12px 25px rgba(238, 122, 167, 0.3);
                  letter-spacing: 0.03em;
                  font-size: 14px;
                "
              >
                Visit ${business.name || 'LashDiary'}
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FDF1F6; padding: 28px 32px; text-align: center;">
              <p style="font-size: 13px; color: #9B5B72; margin: 0 0 8px 0;">
                Questions or special requests? Reply to this email or call us at ${business.phone || '0748 863 882'}.
              </p>
              <p style="font-size: 12px; color: #B07A8F; margin: 0;">
                ${business.name || 'LashDiary'} • ${business.address || 'Nairobi, Kenya'} • <a href="${BASE_URL}" style="color: #B07A8F; text-decoration: underline;">${BASE_URL.replace(/^https?:\/\//, '')}</a>
              </p>
              <p style="font-size: 11px; color: #C295A8; margin: 12px 0 0;">
                Thank you for choosing ${business.name || 'LashDiary'}! We can't wait to see you again for your next appointment.
              </p>
            </td>
          </tr>
          <tr>
            <td style="height: 8px;"></td>
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
        from: `${business.name || 'LashDiary'} <${FROM_EMAIL}>`,
        to: email,
        reply_to: business.email || OWNER_EMAIL,
        bcc: OWNER_EMAIL,
        subject: `${business.name || 'LashDiary'}: We’d love your testimonial!`,
        html: emailHtml,
      })
    } catch (error) {
      console.error('Error sending testimonial request email:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to send testimonial request email',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling testimonial request:', error)
    return NextResponse.json({ error: 'Failed to send testimonial request' }, { status: 500 })
  }
}

