import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sanitizeEmail } from '@/lib/input-validation'
import { randomBytes } from 'crypto'
import type { ClientUsersData } from '@/types/client'
import {
  getZohoTransporter,
  isZohoConfigured,
  sendEmailViaZoho,
  BUSINESS_NOTIFICATION_EMAIL,
  FROM_EMAIL,
  EMAIL_FROM_NAME,
} from '@/lib/email/zoho-config'

// CRITICAL: No caching for password reset - always use fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://lashdiary.co.ke'
const OWNER_EMAIL = BUSINESS_NOTIFICATION_EMAIL

function createPasswordResetEmailTemplate(data: { name: string; resetLink: string }) {
  const { name, resetLink } = data
  const friendlyName = typeof name === 'string' && name.trim().length > 0 ? name.trim().split(' ')[0] : 'there'
  const brand = '#7C4B31'
  const background = '#FDF9F4'
  const card = '#FFFFFF'
  const accent = '#F3E6DC'
  const textPrimary = '#3E2A20'
  const textSecondary = '#6B4A3B'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - LashDiary</title>
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
            <td style="padding:32px; background:${card}; text-align:center;">
              <h1 style="margin:0 0 16px 0; font-size:28px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600;">Secure Password Reset</h1>
              <p style="margin:0; font-size:16px; color:${textSecondary}; line-height:1.6;">
                Hi ${friendlyName}!
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px 32px;">
              <p style="margin:0 0 20px 0; font-size:15px; color:${textPrimary}; line-height:1.7;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0;">
                <tr>
                  <td align="center" style="padding:0;">
                    <a href="${resetLink}" style="display:inline-block; padding:14px 32px; background:${brand}; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:16px;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0 0; font-size:14px; color:${textSecondary}; line-height:1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:8px 0 0 0; font-size:13px; color:${brand}; word-break:break-all; font-family:'Courier New', monospace;">
                ${resetLink}
              </p>

              <div style="border-radius:10px; padding:16px; background:${accent}; margin:24px 0;">
                <p style="margin:0; font-size:13px; color:${textSecondary};">
                  <strong>Security Note:</strong> This link expires in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                </p>
              </div>

              <p style="margin:0; font-size:14px; color:${textSecondary};">
                Questions? Reply to this email or contact us at <a href="mailto:${OWNER_EMAIL}" style="color:${brand}; text-decoration:none; font-weight:600;">${OWNER_EMAIL}</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center; border-top:1px solid ${accent};">
              <p style="margin:0; font-size:13px; color:${textSecondary};">Thank you for being part of LashDiary!</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">🤎 The LashDiary Team</p>
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
    const body = await request.json()
    const { email: rawEmail } = body

    if (!rawEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    let email: string
    try {
      email = sanitizeEmail(rawEmail)
    } catch (error: any) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })

    const user = usersData.users.find(
      (u) => u.email.toLowerCase().trim() === normalizedEmail && u.isActive
    )

    // Don't reveal if user exists or not for security
    if (!user || !user.passwordHash || user.passwordHash.length === 0) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date()
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1) // 1 hour expiry

    // Store reset token in user data
    if (!user.resetTokens) {
      user.resetTokens = []
    }
    user.resetTokens.push({
      token: resetToken,
      expiresAt: resetTokenExpiry.toISOString(),
      used: false,
    })

    await writeDataFile('users.json', usersData)

    // Send reset email IMMEDIATELY - no delays
    const resetLink = `${BASE_URL}/account/reset-password?token=${resetToken}`
    
    if (!isZohoConfigured()) {
      console.error('❌ EMAIL TRANSPORTER NOT CONFIGURED - Password reset email cannot be sent!')
      console.error('Password reset link that should have been sent:', resetLink)
      console.error('User email:', email)
      // Still return success to prevent email enumeration, but log the error
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Prepare email content immediately (synchronous)
    const htmlContent = createPasswordResetEmailTemplate({
      name: user.name || 'User',
      resetLink,
    })

    const textContent = `
Reset Your LashDiary Password

Hi ${user.name || 'there'}!

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This link expires in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.

Questions? Contact us at ${OWNER_EMAIL}

Thank you for being part of LashDiary!
🤎 The LashDiary Team
    `.trim()

    // Send email IMMEDIATELY - await ensures it's sent before responding
    let emailSent = false
    try {
      const startTime = Date.now()
      const emailResult = await sendEmailViaZoho({
        to: email,
        subject: 'Reset Your LashDiary Password',
        html: htmlContent,
        text: textContent,
      })
      const sendTime = Date.now() - startTime

      if (emailResult.success) {
        emailSent = true
        console.log(`✅ Password reset email sent successfully to: ${email} (took ${sendTime}ms)`)
        console.log('✅ Email message ID:', emailResult.messageId)
        console.log('✅ Reset link:', resetLink)
        console.log('✅ Accepted recipients:', emailResult.accepted)
      } else {
        console.error('❌ ERROR SENDING PASSWORD RESET EMAIL:', emailResult.error)
        console.error('❌ Reset link that failed to send:', resetLink)
        console.error('❌ User email:', email)
        console.error('❌ Rejected recipients:', emailResult.rejected)
        // Still return success to prevent email enumeration, but log the error
      }
    } catch (emailError: any) {
      console.error('❌ EXCEPTION SENDING PASSWORD RESET EMAIL:', emailError)
      console.error('❌ Error details:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response,
        stack: emailError.stack,
      })
      console.error('❌ Reset link that failed to send:', resetLink)
      console.error('❌ User email:', email)
      // Still return success to prevent email enumeration, but log the error
    }

    // Response is sent AFTER email is attempted (awaited above)
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

