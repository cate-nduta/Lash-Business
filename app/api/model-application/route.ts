import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import {
  getModelApplicationAnswerValues,
  hasAppointmentConflict,
  loadBookingBusyIntervals,
  loadModelApplicationSettings,
  loadReservedModelAvailabilityOptions,
  MODEL_APPOINTMENT_DURATION_MINUTES,
  parseModelAvailabilitySlot,
} from '@/lib/model-application-settings'
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

function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatModelSlotLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date)
}

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
    const customAnswersRaw = formData.get('customAnswers') as string || '{}'
    const modelQuestionsRaw = formData.get('modelQuestions') as string || '[]'
    const consentItemsRaw = formData.get('consentItems') as string || '[]'
    const consentAcceptedRaw = formData.get('consentAccepted') as string || '{}'
    const settings = await loadModelApplicationSettings()
    let customAnswers: Record<string, string | string[]> = {}
    let modelQuestionsSnapshot = settings.questions
    let consentItemsSnapshot = settings.consentItems
    let consentAccepted: Record<string, boolean> = {}

    try {
      const parsedAnswers = JSON.parse(customAnswersRaw)
      if (parsedAnswers && typeof parsedAnswers === 'object' && !Array.isArray(parsedAnswers)) {
        customAnswers = parsedAnswers
      }
    } catch {
      customAnswers = {}
    }

    try {
      const parsedQuestions = JSON.parse(modelQuestionsRaw)
      if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
        modelQuestionsSnapshot = parsedQuestions
      }
    } catch {
      modelQuestionsSnapshot = settings.questions
    }

    try {
      const parsedConsentItems = JSON.parse(consentItemsRaw)
      if (Array.isArray(parsedConsentItems) && parsedConsentItems.length > 0) {
        consentItemsSnapshot = parsedConsentItems
      }
    } catch {
      consentItemsSnapshot = settings.consentItems
    }

    try {
      const parsedConsent = JSON.parse(consentAcceptedRaw)
      if (parsedConsent && typeof parsedConsent === 'object' && !Array.isArray(parsedConsent)) {
        consentAccepted = parsedConsent
      }
    } catch {
      consentAccepted = {}
    }

    // Validate required fields
    if (!firstName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const missingRequiredQuestion = settings.questions.some((question) => {
      if (!question.required) return false
      const answer = customAnswers[question.id]
      if (Array.isArray(answer)) return answer.length === 0
      return typeof answer !== 'string' || answer.trim().length === 0
    })

    // Validate configured model application questions
    if (missingRequiredQuestion) {
      return NextResponse.json(
        { error: 'Please answer all required model application questions' },
        { status: 400 }
      )
    }

    const missingConsent = settings.consentItems.some((item) => consentAccepted[item.id] !== true)
    if (missingConsent) {
      return NextResponse.json(
        { error: 'Please check all consent boxes to proceed' },
        { status: 400 }
      )
    }

    const selectedAvailabilityOptions = getModelApplicationAnswerValues(customAnswers.availability)
    if (selectedAvailabilityOptions.length !== 1) {
      return NextResponse.json(
        { error: 'Please choose one available model slot' },
        { status: 400 }
      )
    }

    const reservedAvailabilityOptions = await loadReservedModelAvailabilityOptions()
    const selectedAvailability = selectedAvailabilityOptions[0]
    const selectedAvailabilityStart = parseModelAvailabilitySlot(selectedAvailability)
    if (!selectedAvailabilityStart) {
      return NextResponse.json(
        { error: 'Please choose a valid model slot' },
        { status: 400 }
      )
    }

    const availabilityQuestion = settings.questions.find((question) => question.id === 'availability')
    if (!availabilityQuestion?.options.includes(selectedAvailability)) {
      return NextResponse.json(
        { error: 'Please choose one of the available model slots' },
        { status: 400 }
      )
    }

    if (reservedAvailabilityOptions.includes(selectedAvailability)) {
      return NextResponse.json(
        { error: 'That model slot has just been taken. Please choose another available slot.' },
        { status: 409 }
      )
    }

    const bookingBusyIntervals = await loadBookingBusyIntervals()
    if (hasAppointmentConflict(selectedAvailabilityStart, MODEL_APPOINTMENT_DURATION_MINUTES, bookingBusyIntervals)) {
      return NextResponse.json(
        { error: 'That model slot overlaps with an existing booking. Please choose another available slot.' },
        { status: 409 }
      )
    }

    const answerDisplayRows = settings.questions
      .map((question) => {
        const answer = customAnswers[question.id]
        const display =
          question.id === 'availability'
            ? formatModelSlotLabel(selectedAvailability)
            : Array.isArray(answer)
            ? answer.join(', ')
            : answer || 'Not specified'
        return { label: question.label, answer: display }
      })
      .filter((row) => row.answer && row.answer !== 'Not specified')

    const answerByLabel = (fallbackId: string, fallbackValue: string) => {
      const answer = customAnswers[fallbackId]
      if (Array.isArray(answer)) return answer.join(', ') || fallbackValue
      return answer || fallbackValue
    }

    // Get location from contact settings
    const contact = await readDataFile<{ location?: string }>('contact.json', {})
    const location = contact?.location || process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'
    const safeFirstName = escapeHtml(firstName)
    const safeLastName = escapeHtml(lastName)
    const safeFullName = `${safeFirstName}${safeLastName ? ` ${safeLastName}` : ''}`
    const safeEmail = escapeHtml(email)
    const safePhone = escapeHtml(phone)
    const safeInstagram = escapeHtml(instagram)
    const safeLocation = escapeHtml(location)
    const safeAnswerDisplayRows = answerDisplayRows.map((row) => ({
      label: escapeHtml(row.label),
      answer: escapeHtml(row.answer),
    }))
    const modelFeeEnabled = settings.feeSettings.enabled && settings.feeSettings.amount > 0
    const modelFeeAmount = `${settings.feeSettings.currency} ${settings.feeSettings.amount.toLocaleString()}`
    const safeModelFeeNotice = modelFeeEnabled
      ? escapeHtml(settings.feeSettings.noticeText.replace(/\{\{\s*amount\s*\}\}/g, modelFeeAmount))
      : ''

    // Store model application
    const modelApplication = {
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstName,
      lastName,
      email,
      phone,
      instagram,
      availability: selectedAvailability,
      hasLashExtensions: answerByLabel('hasLashExtensions', hasLashExtensions),
      hasAppointmentBefore: answerByLabel('hasAppointmentBefore', hasAppointmentBefore),
      allergies: answerByLabel('allergies', allergies),
      comfortableLongSessions: answerByLabel('comfortableLongSessions', comfortableLongSessions),
      customAnswers,
      modelQuestions: modelQuestionsSnapshot,
      consentItems: consentItemsSnapshot,
      consentAccepted,
      modelFee: modelFeeEnabled
        ? {
            enabled: true,
            amount: settings.feeSettings.amount,
            currency: settings.feeSettings.currency,
            paymentStatus: 'pending' as const,
          }
        : {
            enabled: false,
            amount: 0,
            currency: settings.feeSettings.currency,
            paymentStatus: 'not_required' as const,
          },
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

    // Create admin notification email HTML
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
              <h1 style="margin:0; font-size:32px; color:#7C4B31; font-family:'Playfair Display', Georgia, serif; font-weight:600;">Application Received</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <h2 style="margin:0 0 20px 0; font-size:20px; color:#7C4B31; font-weight:600;">Application Details</h2>
              
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Name:</strong> ${safeFullName}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Email:</strong> ${safeEmail}
                  </td>
                </tr>
                ${phone ? `
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Phone:</strong> ${safePhone}
                  </td>
                </tr>
                ` : ''}
                ${instagram ? `
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">Instagram:</strong> ${safeInstagram}
                  </td>
                </tr>
                ` : ''}
                ${safeAnswerDisplayRows.map((row) => `
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #E8D5C4;">
                    <strong style="color:#7C4B31;">${row.label}:</strong><br>
                    <span style="color:#7C4B31; white-space:pre-wrap;">${row.answer}</span>
                  </td>
                </tr>
                `).join('')}
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <p style="margin:0; font-size:13px; color:#7C4B31; opacity:0.7;">
                <strong>Location:</strong> ${safeLocation}
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

    const applicantEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Model Application Received - LashDiary</title>
</head>
<body style="margin:0; padding:0; background:#FDF9F4; font-family: 'DM Serif Text', Georgia, serif; color:#7C4B31;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FDF9F4; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:#FFFFFF; border-radius:18px; border:1px solid #E8D5C4; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:#FFFFFF;">
              <h1 style="margin:0; font-size:32px; color:#7C4B31; font-family:'Playfair Display', Georgia, serif; font-weight:600;">Application Received</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                Hey ${safeFirstName || 'there'},
              </p>
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                Thank you for applying to be a LashDiary model. We have received your application and will review it carefully.
              </p>
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                If you are selected for an upcoming model slot, we will contact you with the appointment details and preparation instructions. You do not need to submit another application.
              </p>
              ${safeModelFeeNotice ? `
              <div style="background:#FFF7E8; border-left:4px solid #B7791F; padding:16px; margin:22px 0; border-radius:8px;">
                <p style="margin:0 0 8px 0; font-size:15px; font-weight:600; color:#7C4B31;">Model Confirmation Fee</p>
                <p style="margin:0; font-size:15px; line-height:1.6; color:#7C4B31;">
                  ${safeModelFeeNotice}
                </p>
              </div>
              ` : ''}
              <div style="background:#F5F1EB; border-left:4px solid #7C4B31; padding:16px; margin:22px 0; border-radius:8px;">
                <p style="margin:0; font-size:15px; line-height:1.6; color:#7C4B31;">
                  Please keep an eye on your inbox for updates from LashDiary. If you have questions, you can reply directly to this email.
                </p>
              </div>
              <p style="margin:18px 0 0 0; font-size:16px; line-height:1.6; color:#7C4B31;">
                With love,<br>
                <strong>The LashDiary Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px; background:#FDF9F4; text-align:center; border-top:1px solid #E8D5C4;">
              <p style="margin:0; font-size:12px; color:#7C4B31; opacity:0.8;">
                ${safeLocation}
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

    // Send email to business and confirmation to the applicant.
    if (zohoTransporter) {
      try {
        await zohoTransporter.sendMail({
          from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
          to: BUSINESS_NOTIFICATION_EMAIL,
          subject: `New Model Application from ${firstName}${lastName ? ` ${lastName}` : ''}`,
          html: emailHtml,
        })
      } catch (emailError) {
        console.error('Error sending admin model application email:', emailError)
        // Continue even if email fails
      }

      try {
        await zohoTransporter.sendMail({
          from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
          to: email,
          subject: 'Model Application Received - LashDiary',
          html: applicantEmailHtml,
          replyTo: BUSINESS_NOTIFICATION_EMAIL,
        })
      } catch (emailError) {
        console.error('Error sending applicant model application confirmation email:', emailError)
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

