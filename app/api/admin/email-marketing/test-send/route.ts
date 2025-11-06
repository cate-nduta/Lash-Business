import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = process.env.CALENDAR_EMAIL || 'catherinenkuria@gmail.com'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

function createEmailTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LashDiary</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F9D0DE;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9D0DE; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #F9D0DE; padding: 40px 30px; text-align: center; border-bottom: 2px solid #733D26;">
              <h1 style="color: #733D26; margin: 0; font-size: 32px; font-weight: bold;">LashDiary</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                ${content.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9D0DE; padding: 30px; text-align: center; border-top: 2px solid #733D26;">
              <p style="color: #733D26; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">With love and gratitude,</p>
              <p style="color: #733D26; font-size: 16px; font-weight: bold; margin: 0;">The LashDiary Team</p>
              <p style="color: #733D26; font-size: 12px; margin: 20px 0 0 0;">
                <a href="${BASE_URL}" style="color: #733D26; text-decoration: none;">Visit Our Website</a>
              </p>
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

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { subject, content } = body

    if (!subject || !content) {
      return NextResponse.json(
        { error: 'Subject and content are required' },
        { status: 400 }
      )
    }

    // Send test email
    const emailHtml = createEmailTemplate(content)
    
    await resend.emails.send({
      from: `LashDiary <${FROM_EMAIL}>`,
      to: TEST_EMAIL,
      subject: subject,
      html: emailHtml,
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${TEST_EMAIL}`,
    })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email', details: error.message },
      { status: 500 }
    )
  }
}

