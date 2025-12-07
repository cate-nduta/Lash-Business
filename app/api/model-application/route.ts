import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import nodemailer from 'nodemailer'

const EMAIL_FROM_NAME = 'The LashDiary'

const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string || ''
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string || ''
    const instagram = formData.get('instagram') as string || ''
    const availability = formData.get('availability') as string
    const hasLashExtensions = formData.get('hasLashExtensions') as string || ''
    const hasAppointmentBefore = formData.get('hasAppointmentBefore') as string || ''
    const allergies = formData.get('allergies') as string || ''
    const comfortableLongSessions = formData.get('comfortableLongSessions') as string || ''

    // Validate required fields
    if (!firstName || !email || !phone || !availability) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate lash experience questions
    if (!hasLashExtensions || !hasAppointmentBefore || !comfortableLongSessions) {
      return NextResponse.json(
        { error: 'Please answer all lash experience questions' },
        { status: 400 }
      )
    }

    // Get location from contact settings
    const contact = await readDataFile<{ location?: string }>('contact.json', {})
    const location = contact?.location || process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'

    // Store model application
    const modelApplication = {
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstName,
      lastName,
      email,
      phone,
      instagram,
      availability,
      hasLashExtensions,
      hasAppointmentBefore,
      allergies,
      comfortableLongSessions,
      submittedAt: new Date().toISOString(),
      status: 'pending' as 'pending' | 'selected' | 'rejected',
    }

    // Load existing applications
    const existingApplications = await readDataFile<{ applications: typeof modelApplication[] }>('model-applications.json', { applications: [] })
    existingApplications.applications.push(modelApplication)
    await writeDataFile('model-applications.json', existingApplications)

    // Automatically subscribe model applicant to email marketing
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const subscribersData = await readDataFile<{ subscribers: Array<{ email: string; name?: string; source?: string; createdAt?: string }> }>('email-subscribers.json', { subscribers: [] })
      
      // Check if already subscribed
      const existingSubscriber = subscribersData.subscribers.find(
        (sub) => sub.email.toLowerCase() === normalizedEmail
      )
      
      // Only add if not already subscribed
      if (!existingSubscriber) {
        const newSubscriber = {
          email: normalizedEmail,
          name: `${firstName} ${lastName}`.trim() || firstName,
          source: 'model-application',
          createdAt: new Date().toISOString(),
        }
        
        subscribersData.subscribers.push(newSubscriber)
        await writeDataFile('email-subscribers.json', subscribersData)
        console.log(`Model applicant ${normalizedEmail} automatically subscribed to email marketing`)
      }
    } catch (subscribeError) {
      // Don't fail the application if subscription fails
      console.error('Error auto-subscribing model applicant:', subscribeError)
    }

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Model Application - LashDiary</title>
</head>
<body style="margin:0; padding:0; background:#FDF9F4; font-family: 'DM Serif Text', Georgia, serif; color:#7C4B31;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FDF9F4; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:#FFFFFF; border-radius:18px; border:1px solid #E8D5C4; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:#FFFFFF;">
              <h1 style="margin:0; font-size:32px; color:#7C4B31; font-family:'Playfair Display', Georgia, serif; font-weight:600;">New Model Application</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <h2 style="margin:0 0 20px 0; font-size:20px; color:#7C4B31; font-weight:600;">Application Details</h2>
              
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Name:</strong> ${firstName}${lastName ? ` ${lastName}` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Email:</strong> ${email}
                  </td>
                </tr>
                ${phone ? `
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Phone:</strong> ${phone}
                  </td>
                </tr>
                ` : ''}
                ${instagram ? `
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Instagram:</strong> ${instagram}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Availability:</strong><br>
                    <span style="color:#7C4B31; white-space:pre-wrap;">${availability}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Has had lash extensions before:</strong> ${hasLashExtensions || 'Not specified'}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Has been a client at LashDiary before:</strong> ${hasAppointmentBefore || 'Not specified'}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Allergies/Sensitivities:</strong><br>
                    <span style="color:#7C4B31; white-space:pre-wrap;">${allergies || 'None specified'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <strong style="color:#7C4B31;">Comfortable with long sessions (3-4 hours):</strong> ${comfortableLongSessions || 'Not specified'}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <p style="margin:0; font-size:13px; color:#7C4B31; opacity:0.7;">
                <strong>Location:</strong> ${location}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Send email to business (admin notification only)
    // Note: No email is sent to the applicant at this stage
    // They will only receive an email when the admin accepts them via the admin panel
    if (zohoTransporter) {
      try {
        await zohoTransporter.sendMail({
          from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
          to: BUSINESS_NOTIFICATION_EMAIL,
          subject: `New Model Application from ${firstName}${lastName ? ` ${lastName}` : ''}`,
          html: emailHtml,
        })
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // Continue even if email fails
      }
    }

    return NextResponse.json({ success: true, message: 'Application submitted successfully' })
  } catch (error: any) {
    console.error('Error processing model application:', error)
    return NextResponse.json(
      { error: 'Failed to process application. Please try again.' },
      { status: 500 }
    )
  }
}

