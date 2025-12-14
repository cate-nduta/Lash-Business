import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get user from auth check
    const authResponse = await fetch(`${request.nextUrl.origin}/api/labs/auth/check`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    })

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authData = await authResponse.json()
    if (!authData.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { config, testEmail } = body

    if (!config || !testEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create transporter with custom config
    const transporter = nodemailer.createTransport({
      host: config.smtpHost || 'smtp.zoho.com',
      port: config.smtpPort || 465,
      secure: config.smtpSecure !== false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    })

    // Send test email
    const fromAddress = config.fromName 
      ? `"${config.fromName}" <${config.fromEmail}>`
      : config.fromEmail

    await transporter.sendMail({
      from: fromAddress,
      to: testEmail,
      subject: 'Test Email from Your Website',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">✅ Email Configuration Test</h2>
          <p>Congratulations! Your email configuration is working correctly.</p>
          <p>This test email was sent from <strong>${config.fromName || config.fromEmail}</strong>.</p>
          <p>All booking confirmations, reminders, and other emails from your website will now appear to come from your business.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            From: ${fromAddress}<br>
            SMTP Host: ${config.smtpHost}:${config.smtpPort}
          </p>
        </div>
      `,
      text: `Email Configuration Test\n\nCongratulations! Your email configuration is working correctly.\n\nThis test email was sent from ${config.fromName || config.fromEmail}.\n\nAll booking confirmations, reminders, and other emails from your website will now appear to come from your business.`,
    })

    return NextResponse.json({ success: true, message: 'Test email sent successfully' })
  } catch (error: any) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test email. Please check your SMTP settings.' },
      { status: 500 }
    )
  }
}

