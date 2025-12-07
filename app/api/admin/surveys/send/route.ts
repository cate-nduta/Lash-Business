import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'
const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'
const ZOHO_SMTP_USER = process.env.ZOHO_SMTP_USER || process.env.ZOHO_SMTP_USERNAME || ''
const ZOHO_SMTP_PASS = process.env.ZOHO_SMTP_PASS || process.env.ZOHO_SMTP_PASSWORD || ''
const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com'
const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465)
const ZOHO_FROM_EMAIL =
  process.env.ZOHO_FROM_EMAIL ||
  process.env.ZOHO_FROM ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : '') ||
  BUSINESS_NOTIFICATION_EMAIL
const FROM_EMAIL =
  process.env.FROM_EMAIL ||
  ZOHO_FROM_EMAIL ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : BUSINESS_NOTIFICATION_EMAIL)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'The LashDiary'

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

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

function createSurveyEmailTemplate(clientName: string, surveyLink: string, emailMessage: string) {
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  const friendlyName = clientName.split(' ')[0]

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We'd Love Your Feedback</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Serif+Text&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background:${background}; font-family: 'DM Serif Text', Georgia, serif; color:${textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${card}; border-radius:18px; border:1px solid ${accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${card};">
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">🥰 Quarterly Survey</p>
              <h1 style="margin:12px 0 0 0; font-size:36px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600; line-height:1.3; letter-spacing:0.5px;">Hi ${friendlyName}! 💋</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                ${emailMessage}
              </p>
              
              <p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                Your feedback helps us improve and serve you better. It only takes a few minutes!
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0;">
                <tr>
                  <td align="center" style="padding:0;">
                    <a href="${surveyLink}" style="display:inline-block; padding:14px 32px; background:${brand}; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:15px; letter-spacing:0.04em; text-transform:uppercase;">Take Survey</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center;">
              <p style="margin:0; font-size:13px; color:${textSecondary};">🥰 Thank you for being a valued client! 💋</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">🤎 The LashDiary Team 🥰</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

async function sendEmailViaZoho(to: string, subject: string, html: string) {
  if (!zohoTransporter) {
    throw new Error('Zoho SMTP not configured')
  }

  const result = await zohoTransporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  })

  return result
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const { clientEmails, quarter, year } = body

    if (!clientEmails || !Array.isArray(clientEmails) || clientEmails.length === 0) {
      return NextResponse.json({ error: 'Client emails are required' }, { status: 400 })
    }

    const surveyData = await readDataFile<{
      questions: any[]
      settings: any
    }>('surveys.json', {
      questions: [],
      settings: {},
    })

    if (!surveyData.questions || surveyData.questions.length === 0) {
      return NextResponse.json({ error: 'No survey questions configured' }, { status: 400 })
    }

    // Get client names from the clients endpoint
    const clientsResponse = await fetch(`${BASE_URL}/api/admin/surveys/clients?quarter=${quarter || ''}&year=${year || ''}`)
    const clientsData = await clientsResponse.json()
    const clientsMap = new Map(
      (clientsData.clients || []).map((c: any) => [c.email.toLowerCase(), c.name])
    )

    const emailSubject = surveyData.settings?.emailSubject || "We'd Love Your Feedback!"
    const emailMessage = surveyData.settings?.emailMessage || "Thank you for being a valued client! We'd love to hear about your experience with us."

    const sentEmails: string[] = []
    const failedEmails: Array<{ email: string; error: string }> = []

    // Generate unique tokens for each client
    const surveyTokens = await readDataFile<Record<string, { token: string; email: string; sentAt: string; quarter: string }>>(
      'survey-tokens.json',
      {}
    )

    for (const email of clientEmails) {
      try {
        // Generate or reuse token
        let token = surveyTokens[email]?.token
        if (!token) {
          token = randomBytes(32).toString('hex')
          surveyTokens[email] = {
            token,
            email: email.toLowerCase(),
            sentAt: new Date().toISOString(),
            quarter: quarter || `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`,
          }
        } else {
          // Update sent date and quarter
          surveyTokens[email].sentAt = new Date().toISOString()
          surveyTokens[email].quarter = quarter || `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`
        }

        const clientName = clientsMap.get(email.toLowerCase()) || email.split('@')[0]
        const surveyLink = `${BASE_URL}/survey/${token}`
        const html = createSurveyEmailTemplate(clientName, surveyLink, emailMessage)

        // Send via Zoho SMTP
        try {
          if (zohoTransporter) {
            await sendEmailViaZoho(email, emailSubject, html)
          } else {
            throw new Error('Email service not configured. Please set up ZOHO_SMTP credentials.')
          }

          sentEmails.push(email)
        } catch (emailError: any) {
          failedEmails.push({ email, error: emailError.message || 'Failed to send email' })
        }
      } catch (error: any) {
        failedEmails.push({ email, error: error.message || 'Unknown error' })
      }
    }

    // Save tokens (with error handling - don't fail the entire operation if this fails)
    try {
      await writeDataFile('survey-tokens.json', surveyTokens)
    } catch (tokenError: any) {
      console.error('Error saving survey tokens (emails still sent):', tokenError)
      // Continue even if token saving fails - emails were already sent
    }

    // Update last sent quarter (with error handling)
    if (quarter) {
      try {
        surveyData.settings.lastSentQuarter = quarter
        await writeDataFile('surveys.json', surveyData)
      } catch (settingsError: any) {
        console.error('Error saving survey settings (emails still sent):', settingsError)
        // Continue even if settings saving fails
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentEmails.length,
      failed: failedEmails.length,
      sentEmails,
      failedEmails,
      warning: sentEmails.length > 0 && (sentEmails.length < clientEmails.length) 
        ? 'Some emails were sent but token saving may have failed. Check server logs.' 
        : undefined,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error sending survey emails:', error)
    return NextResponse.json({ error: 'Failed to send survey emails' }, { status: 500 })
  }
}

