import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import {
  getZohoTransporter,
  isZohoConfigured,
  BUSINESS_NOTIFICATION_EMAIL,
  FROM_EMAIL,
  EMAIL_FROM_NAME,
} from '@/lib/email/zoho-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const OWNER_EMAIL = BUSINESS_NOTIFICATION_EMAIL

// POST - Send email to waitlist members
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entries } = body

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'Email list is required and must not be empty' },
        { status: 400 }
      )
    }

    // Check if email is configured
    if (!isZohoConfigured()) {
      return NextResponse.json(
        { error: 'Email service is not configured. Please configure Zoho SMTP settings.' },
        { status: 500 }
      )
    }

    const transporter = getZohoTransporter()
    if (!transporter) {
      return NextResponse.json(
        { error: 'Email transporter not available' },
        { status: 500 }
      )
    }

    // Load waitlist settings to get discount info
    const waitlistSettings = await readDataFile<any>(
      'labs-waitlist-settings.json',
      { discountPercentage: 0, discountCodePrefix: 'WAITLIST' }
    )

    // Load waitlist entries to get discount codes
    const waitlistData = await readDataFile<any>(
      'labs-waitlist.json',
      { entries: [] }
    )

    const emailMap = new Map<string, { email: string; signedUpAt: string; discountCode?: string }>(
      waitlistData.entries.map((entry: any) => [entry.email.toLowerCase(), entry])
    )

    let successCount = 0
    let failureCount = 0
    const errors: string[] = []

    // Send emails to all entries
    for (const email of entries) {
      try {
        const entry = emailMap.get(email.toLowerCase())
        const discountCode = entry?.discountCode || undefined
        const discountPercentage = waitlistSettings.discountPercentage || 0

        const emailSubject = discountPercentage > 0 && discountCode
          ? `🎉 Your ${discountPercentage}% Discount Code for LashDiary Labs`
          : 'Welcome to the LashDiary Labs Waitlist!'

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 24px; background: #FDF9F4; color: #3E2A20;">
            <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #7C4B31; margin: 0; font-size: 28px;">Welcome to LashDiary Labs!</h1>
              </div>
              
              <p style="color: #6B4A3B; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Thank you for joining our waitlist! We're excited to have you on board.
              </p>

              ${discountPercentage > 0 && discountCode ? `
                <div style="background: #F3E6DC; border: 2px solid #7C4B31; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
                  <h2 style="color: #7C4B31; margin: 0 0 16px 0; font-size: 22px;">🎉 Your Exclusive Discount Code</h2>
                  <p style="color: #6B4A3B; font-size: 16px; margin-bottom: 12px;">
                    As a thank you for joining early, you'll receive <strong>${discountPercentage}% off</strong> when LashDiary Labs launches!
                  </p>
                  <div style="background: #FFFFFF; border: 2px dashed #7C4B31; border-radius: 6px; padding: 16px; margin: 16px 0;">
                    <p style="color: #3E2A20; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">Your Discount Code:</p>
                    <p style="color: #7C4B31; font-size: 24px; font-weight: bold; font-family: monospace; margin: 0; letter-spacing: 2px;">
                      ${discountCode}
                    </p>
                  </div>
                  <p style="color: #6B4A3B; font-size: 14px; margin: 16px 0 0 0;">
                    Save this code! You'll be able to use it when you purchase your Labs system.
                  </p>
                </div>
              ` : ''}

              <div style="background: #F3E6DC; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #7C4B31; margin: 0 0 12px 0; font-size: 18px;">What Happens Next?</h3>
                <ul style="color: #6B4A3B; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>You'll be notified when LashDiary Labs officially launches</li>
                  <li>Get early access to book your consultation and choose your system tier</li>
                  <li>Transform your business with a professional booking website</li>
                  <li>No spam — we'll only email you with important updates</li>
                </ul>
              </div>

              <div style="text-align: center; margin-top: 32px;">
                <a href="https://lashdiary.co.ke/labs" 
                   style="display: inline-block; background: #7C4B31; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Learn More About Labs
                </a>
              </div>

              <p style="color: #6B4A3B; font-size: 14px; line-height: 1.6; margin-top: 32px; padding-top: 24px; border-top: 1px solid #E8D5C4;">
                If you have any questions, feel free to reach out to us at{' '}
                <a href="mailto:${OWNER_EMAIL}" style="color: #7C4B31; text-decoration: none;">${OWNER_EMAIL}</a>
              </p>

              <p style="color: #6B4A3B; font-size: 12px; margin-top: 24px; text-align: center;">
                — The LashDiary Team
              </p>
            </div>
          </div>
        `

        await transporter.sendMail({
          from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
          to: email,
          subject: emailSubject,
          html: emailHtml,
        })

        successCount++
      } catch (error: any) {
        console.error(`Error sending email to ${email}:`, error)
        failureCount++
        errors.push(`${email}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: entries.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Emails sent: ${successCount} successful, ${failureCount} failed`,
    })
  } catch (error: any) {
    console.error('Error sending waitlist emails:', error)
    return NextResponse.json(
      { error: 'Failed to send emails', details: error.message },
      { status: 500 }
    )
  }
}

